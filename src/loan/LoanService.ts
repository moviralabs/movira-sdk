import { ConnectionManager } from '../client/ConnectionManager.js';
import type { IWalletAdapter } from '../wallet/WalletAdapter.js';
import { stableStringify, sha256Hex } from '../utils/serialization.js';
import type { LoanRequest, LoanRecord } from './LoanTypes.js';
import { Transaction, TransactionInstruction, PublicKey } from '@solana/web3.js';
import { MoviraError, ErrorCode } from '../errors/MoviraError.js';
import { RepaymentService } from './RepaymentService.js';

export class LoanService {
  private repayment: RepaymentService;

  constructor(private conn: ConnectionManager, private wallet: IWalletAdapter) {
    this.repayment = new RepaymentService(conn, wallet);
  }

  /**
   * Request a loan by submitting a memo transaction describing the loan intent.
   * - Builds a deterministic payload and computes loanId = sha256(serializedPayload)
   * - Submits an SPL Memo transaction containing the payload and returns loanId and txSignature
   * - This is an auditable on-chain request which lenders can observe and act on
   * @param input {LoanRequest}
   */
  async requestLoan(input: LoanRequest): Promise<{ loanId: string; txSignature: string }> {
    if (!this.wallet.publicKey) throw new MoviraError(ErrorCode.WALLET_NOT_CONNECTED, 'Wallet not connected');

    if (!input.invoiceId) throw new MoviraError(ErrorCode.INVALID_INPUT, 'invoiceId required');
    if (!(input.requestedAmount > 0)) throw new MoviraError(ErrorCode.INVALID_INPUT, 'requestedAmount must be > 0');

    const payload = {
      ...input,
      borrowerWallet: this.wallet.publicKey.toBase58(),
      createdAt: Math.floor(Date.now() / 1000),
    };

    const serialized = stableStringify(payload);
    const loanId = sha256Hex(serialized);

    const memoIx = new TransactionInstruction({
      keys: [],
      programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
      data: Buffer.from(serialized, 'utf8'),
    });

    const tx = new Transaction().add(memoIx);

    try {
      const signed = await this.wallet.signTransaction(tx);
      const sig = await this.conn.connection.sendRawTransaction(signed.serialize());
      await this.conn.connection.confirmTransaction(sig, 'confirmed');
      return { loanId, txSignature: sig };
    } catch (e: any) {
      throw new MoviraError(ErrorCode.TRANSACTION_FAILED, 'Failed to submit loan request', { error: e?.message });
    }
  }

  /**
   * Get loan status by searching recent memos and related transactions for the given loanId.
   * Heuristics (best-effort): 'requested', 'active' (funded), 'repaid', 'defaulted', or 'not_found'
   */
  async getLoanStatus(loanId: string): Promise<'requested' | 'active' | 'repaid' | 'defaulted' | 'not_found'> {
    // Search recent signatures associated with the current wallet for memos containing loanId
    const sigs = await this.conn.connection.getSignaturesForAddress(this.wallet.publicKey!, { limit: 1000 });
    let found = false;
    let status: 'requested' | 'active' | 'repaid' | 'defaulted' | 'not_found' = 'not_found';
    for (const s of sigs) {
      const full = await this.conn.connection.getTransaction(s.signature, { commitment: 'confirmed' });
      if (!full) continue;
      const memoIx = full.transaction.message.instructions.find((ix: any) => ix.programId.toBase58 && ix.programId.toBase58() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
      if (!memoIx) continue;
      const _data = (memoIx as any).data;
      const memoData = typeof _data === 'string' ? Buffer.from(_data, 'base64').toString('utf8') : Buffer.from(_data).toString('utf8');
      if (!memoData.includes(loanId)) continue;
      found = true;
      if (memoData.toLowerCase().includes('repay')) return 'repaid';
      if (memoData.toLowerCase().includes('loan') || memoData.toLowerCase().includes('lend')) status = 'active';
      else status = 'requested';
    }
    return found ? status : 'not_found';
  }

  /**
   * Repay a loan on-chain by transferring funds to the lender and adding a memo referencing the loanId.
   * Supports partial and full repayments and returns the repayment transaction signature.
   */
  async repayLoan({ lenderPubkey, loanId, amountSOL }: { lenderPubkey: string; loanId: string; amountSOL: number; }) {
    return this.repayment.repayLoan({ lenderPubkey, loanId, amountSOL });
  }
}
