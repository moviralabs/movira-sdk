import { describe, it, expect } from 'vitest';
import { SignatureManager } from '../wallet/WalletAdapter.js';
import { Keypair, Transaction, SystemProgram } from '@solana/web3.js';

describe('SignatureManager', () => {
  it('adds a signature to a transaction', async () => {
    const payer = Keypair.generate();
    const signer = new SignatureManager({ publicKey: payer.publicKey, secretKey: payer.secretKey });
    const tx = new Transaction();
    tx.add(SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: payer.publicKey, lamports: 1 }));
    // Provide minimal required fields for signing in tests
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = '11111111111111111111111111111111';

    const signed = await signer.signTransaction(tx);
    expect(signed.signatures.length).toBeGreaterThan(0);
    expect(signed.signatures.some(s => s.publicKey.equals(payer.publicKey))).toBeTruthy();
  });
});
