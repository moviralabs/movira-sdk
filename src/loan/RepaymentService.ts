import { ConnectionManager } from '../client/ConnectionManager.js';
import type { IWalletAdapter } from '../wallet/WalletAdapter.js';
import { SystemProgram, Transaction, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { MoviraError, ErrorCode } from '../errors/MoviraError.js';

export class RepaymentService {
  constructor(private conn: ConnectionManager, private wallet: IWalletAdapter) {}

  /**
   * Repay a loan by transferring lamports to the lender's public key and including a memo referencing the loanId.
   * partial repayment is supported by sending a smaller amount.
   */
  async repayLoan({ lenderPubkey, loanId, amountSOL }: { lenderPubkey: string; loanId: string; amountSOL: number; }): Promise<{ txSignature: string }> {
    if (!this.wallet.publicKey) throw new MoviraError(ErrorCode.WALLET_NOT_CONNECTED, 'Wallet not connected');
    if (!lenderPubkey) throw new MoviraError(ErrorCode.INVALID_INPUT, 'lenderPubkey required');

    const lamports = Math.round(amountSOL * 1e9);
    const transferIx = SystemProgram.transfer({ fromPubkey: this.wallet.publicKey!, toPubkey: new PublicKey(lenderPubkey), lamports });

    const memoIx = new TransactionInstruction({
      keys: [],
      programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
      data: Buffer.from(JSON.stringify({ type: 'repay', loanId }), 'utf8'),
    });

    const tx = new Transaction().add(transferIx, memoIx);

    try {
      const signed = await this.wallet.signTransaction(tx);
      const sig = await this.conn.connection.sendRawTransaction(signed.serialize());
      await this.conn.connection.confirmTransaction(sig, 'confirmed');
      return { txSignature: sig };
    } catch (e: any) {
      throw new MoviraError(ErrorCode.TRANSACTION_FAILED, 'Failed to submit repayment', { error: e?.message });
    }
  }
}
