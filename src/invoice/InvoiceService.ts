import { ConnectionManager } from '../client/ConnectionManager.js';
import type { IWalletAdapter } from '../wallet/WalletAdapter.js';
import { validateInvoiceInput } from './InvoiceValidator.js';
import { stableStringify, sha256Hex } from '../utils/serialization.js';
import type { InvoiceInput, InvoiceRecord } from './InvoiceTypes.js';
import {
  Transaction,
  SystemProgram,
  TransactionInstruction,
  sendAndConfirmTransaction,
  PublicKey,
} from '@solana/web3.js';
import { MoviraError, ErrorCode } from '../errors/MoviraError.js';
import fetch from 'node-fetch';

/**
 * InvoiceService
 * - createInvoice: serializes invoice deterministically, posts as a Memo-like on-chain transaction and returns invoiceId and signature
 * - verifyInvoice: checks the transaction by signature or searches by invoiceId
 * - getInvoiceStatus: derives status by inspecting on-chain memo transactions
 */
export class InvoiceService {
  constructor(private conn: ConnectionManager, private wallet: IWalletAdapter) {}

  /**
   * Create an invoice on-chain by submitting a transaction whose memo contains the deterministic invoice JSON.
   * Behavior:
   * - Validates input and serializes deterministically (stable JSON sort)
   * - Computes invoiceId = sha256(serializedPayload)
   * - Submits a transaction containing the serialized payload as an SPL Memo instruction
   * - Returns the calculated invoiceId and the transaction signature once confirmed
   *
   * On-chain side-effects: a confirmed transaction visible in explorers containing the memo payload.
   * @param input {InvoiceInput} invoice inputs
   * @returns {Promise<{invoiceId: string, txSignature: string}>}
   * @throws {MoviraError} for validation or transaction failures
   */
  async createInvoice(input: InvoiceInput): Promise<{ invoiceId: string; txSignature: string }>
  {
    validateInvoiceInput(input);

    // Build deterministic payload augmented with issuer
    if (!this.wallet.publicKey) throw new MoviraError(ErrorCode.WALLET_NOT_CONNECTED, 'Wallet not connected');

    const issuerWallet = this.wallet.publicKey.toBase58();
    const payload = {
      ...input,
      issuerWallet,
      createdAt: Math.floor(Date.now() / 1000),
    };

    const serialized = stableStringify(payload);
    const invoiceId = sha256Hex(serialized);

    // Build a transaction: we use the SPL Memo program (program id: MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr)
    const memoProgramId = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

    const memoIx = new TransactionInstruction({
      keys: [],
      programId: new PublicKey(memoProgramId),
      data: Buffer.from(serialized, 'utf8'),
    });

    const tx = new Transaction().add(memoIx);

    try {
      const signed = await this.wallet.signTransaction(tx);
      const sig = await this.conn.connection.sendRawTransaction(signed.serialize());
      await this.conn.connection.confirmTransaction(sig, 'confirmed');

      // After success, optionally POST to an oracle/relay (noop here unless configured externally)
      return { invoiceId, txSignature: sig };
    } catch (err: any) {
      throw new MoviraError(ErrorCode.TRANSACTION_FAILED, 'Failed to submit invoice transaction', { error: err?.message });
    }
  }

  /**
   * Verify that an invoice exists and matches expected payload.
   * You must provide either a txSignature or an invoiceId. The method will:
   * - Fetch the transaction (if txSignature provided) and parse the memo payload
   * - Recompute the deterministic invoiceId and compare
   * - If only invoiceId is provided, it scans recent memos produced by the connected wallet for matches (best-effort, limited window)
   * @param params { invoiceId?: string; txSignature?: string }
   * @returns { verified: boolean, record?: InvoiceRecord }
   */
  async verifyInvoice({ invoiceId, txSignature }: { invoiceId?: string; txSignature?: string; }): Promise<{ verified: boolean; record?: InvoiceRecord }>
  {
    if (!txSignature && !invoiceId) throw new MoviraError(ErrorCode.INVALID_INPUT, 'invoiceId or txSignature required');

    // If txSignature provided, fetch transaction and parse memo
    if (txSignature) {
      const confirmed = await this.conn.connection.getTransaction(txSignature, { commitment: 'confirmed' });
      if (!confirmed) return { verified: false };

      // Locate memo instruction
      const memoIx = confirmed.transaction.message.instructions.find((ix: any) => {
        return ix.programId.toBase58() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr' || ix.programId === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
      });

      if (!memoIx) return { verified: false };

      const _data = (memoIx as any).data;
      const memoData = typeof _data === 'string' ? Buffer.from(_data, 'base64').toString('utf8') : Buffer.from(_data).toString('utf8');
      const parsed = JSON.parse(memoData) as InvoiceRecord;
      const serialized = stableStringify({
        amount: parsed.amount,
        recipientWallet: parsed.recipientWallet,
        dueDate: parsed.dueDate,
        description: parsed.description,
        issuerName: parsed.issuerName,
        issuerWallet: parsed.issuerWallet,
        createdAt: parsed.createdAt,
      });
      const calcId = sha256Hex(serialized);
      if (invoiceId && calcId !== invoiceId) return { verified: false };

      return { verified: true, record: { ...parsed, invoiceId: calcId, txSignature } };
    }

    // If only invoiceId provided, attempt to search transactions that contain the invoiceId in memo payload
    const txs = await this.conn.connection.getSignaturesForAddress(this.wallet.publicKey!, { limit: 1000 });
    for (const tx of txs) {
      const full = await this.conn.connection.getTransaction(tx.signature, { commitment: 'confirmed' });
      if (!full) continue;
      const memoIx = full.transaction.message.instructions.find((ix: any) => ix.programId.toBase58 && ix.programId.toBase58() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
      if (!memoIx) continue;
      const _data = (memoIx as any).data;
      const memoData = typeof _data === 'string' ? Buffer.from(_data, 'base64').toString('utf8') : Buffer.from(_data).toString('utf8');
      const parsed = JSON.parse(memoData) as InvoiceRecord;
      const serialized = stableStringify({
        amount: parsed.amount,
        recipientWallet: parsed.recipientWallet,
        dueDate: parsed.dueDate,
        description: parsed.description,
        issuerName: parsed.issuerName,
        issuerWallet: parsed.issuerWallet,
        createdAt: parsed.createdAt,
      });
      const calcId = sha256Hex(serialized);
      if (calcId === invoiceId) {
        return { verified: true, record: { ...parsed, invoiceId: calcId, txSignature: tx.signature } };
      }
    }

    return { verified: false };
  }

  /**
   * Determine an invoice status by inspecting on-chain memos related to the connected wallet.
   * Heuristics (best-effort):
   * - 'not_found' if the invoice memo cannot be found
   * - 'verified' if the invoice memo is present
   * - 'financed' if a loan memo referencing the invoice exists
   * - 'settled' if a repay memo referencing the invoice exists
   * @param invoiceId string invoice identifier (sha256 hex)
   */
  async getInvoiceStatus(invoiceId: string): Promise<'pending' | 'verified' | 'financed' | 'settled' | 'not_found'> {
    // First, verify invoice exists
    const verify = await this.verifyInvoice({ invoiceId });
    if (!verify.verified) return 'not_found';

    // If exists, return 'verified' at minimum
    // Heuristic: search recent transactions for memos that include the invoiceId and keywords 'loan' or 'repay'
    const sigs = await this.conn.connection.getSignaturesForAddress(this.wallet.publicKey!, { limit: 200 });
    let status: 'verified' | 'financed' | 'settled' = 'verified';
    for (const s of sigs) {
      const full = await this.conn.connection.getTransaction(s.signature, { commitment: 'confirmed' });
      if (!full) continue;
      const memoIx = full.transaction.message.instructions.find((ix: any) => ix.programId.toBase58 && ix.programId.toBase58() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
      if (!memoIx) continue;
      const _data = (memoIx as any).data;
      const memoData = typeof _data === 'string' ? Buffer.from(_data, 'base64').toString('utf8') : Buffer.from(_data).toString('utf8');
      if (!memoData.includes(invoiceId)) continue;
      if (memoData.toLowerCase().includes('repay')) return 'settled';
      if (memoData.toLowerCase().includes('loan')) status = 'financed';
    }

    return status;
  }
}
