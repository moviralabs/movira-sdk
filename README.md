# @movira/sdk

Production-grade TypeScript SDK for invoice-backed lending on Solana.

## Key features
- Deterministic invoice serialization and on-chain anchoring (Memo program)
- Extensible credit evaluation with oracle integration and pluggable risk models
- Loan request, status tracking, and repayment flows with real Solana transactions
- Wallet-based authorization only (no private key storage inside SDK)

## Example (Node.js)

```ts
import { MoviraClient, SignatureManager } from '@movira/sdk';
import { Keypair } from '@solana/web3.js';

const payer = Keypair.generate();
const signer = new SignatureManager({ publicKey: payer.publicKey, secretKey: payer.secretKey });

const client = new MoviraClient({ rpcUrl: 'https://api.mainnet-beta.solana.com', programId: 'YourProgramIdHere' }, signer);
await client.connect();

// Create an invoice
const invoice = {
  amount: 1.5,
  recipientWallet: 'RecipientPubkeyHere',
  dueDate: Math.floor(Date.now() / 1000) + 86400 * 30,
  description: 'Invoice for services',
};

const { invoiceId, txSignature } = await client.invoice.createInvoice(invoice);
console.log('Invoice created', invoiceId, txSignature);

// Request a loan against the invoice
const loan = await client.loan.requestLoan({ invoiceId, requestedAmount: 1.0, loanDurationDays: 60 });
console.log('Loan requested', loan);
```

See JSDoc for full method documentation.
