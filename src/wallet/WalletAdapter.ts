import { PublicKey, Transaction } from '@solana/web3.js';

/**
 * Minimal wallet adapter interface expected by MoviraClient.
 * This does NOT implement any UI logic — it expects a server-side
 * compatible signer adapter (for example, a remote signer bridge).
 */
export interface IWalletAdapter {
  publicKey?: PublicKey;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  signTransaction(tx: Transaction): Promise<Transaction>;
  signAllTransactions?(txs: Transaction[]): Promise<Transaction[]>;
}

/**
 * Simple wrapper to adapt a RawKeypair (Signer) for Node usage.
 * NOTE: This is NOT a recommended production pattern for custodial setups.
 * Use your own secure signer adapter.
 */
export class SignatureManager implements IWalletAdapter {
  private signer: { publicKey: PublicKey; secretKey: Uint8Array };

  public publicKey?: PublicKey;

  constructor(signer: { publicKey: PublicKey; secretKey: Uint8Array }) {
    this.signer = signer;
    this.publicKey = signer.publicKey;
  }

  async connect(): Promise<void> {
    // No-op for local signer
    return;
  }

  async disconnect(): Promise<void> {
    // No-op
    return;
  }

  async signTransaction(tx: Transaction): Promise<Transaction> {
    tx.partialSign({ publicKey: this.signer.publicKey, secretKey: this.signer.secretKey } as any);
    return tx;
  }

  async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    for (const tx of txs) await this.signTransaction(tx);
    return txs;
  }
}
