import type { UnixTimestamp } from '../types/CommonTypes.js';

export type InvoiceStatus = 'pending' | 'verified' | 'financed' | 'settled';

export interface InvoiceInput {
  amount: number; // in SOL (lamports conversions handled externally)
  recipientWallet: string; // base58 pubkey
  dueDate: UnixTimestamp; // epoch seconds
  description?: string;
  issuerName?: string;
}

export interface InvoiceRecord extends InvoiceInput {
  invoiceId: string; // hex sha256 of the serialized invoice
  issuerWallet: string; // base58 pubkey
  createdAt: UnixTimestamp;
  status: InvoiceStatus;
  txSignature: string;
}
