import { describe, it, expect } from 'vitest';
import { validateInvoiceInput } from '../invoice/InvoiceValidator.js';
import type { InvoiceInput } from '../invoice/InvoiceTypes.js';

describe('validation', () => {
  it('rejects invalid amount', () => {
    const input = { amount: 0, recipientWallet: 'A'.repeat(44), dueDate: Math.floor(Date.now() / 1000) + 1000 } as InvoiceInput;
    expect(() => validateInvoiceInput(input)).toThrow();
  });

  it('rejects past due date', () => {
    const input = { amount: 1, recipientWallet: 'A'.repeat(44), dueDate: Math.floor(Date.now() / 1000) - 1000 } as InvoiceInput;
    expect(() => validateInvoiceInput(input)).toThrow();
  });

  it('accepts valid invoice', () => {
    const input = { amount: 1.2, recipientWallet: 'A'.repeat(44), dueDate: Math.floor(Date.now() / 1000) + 86400 } as InvoiceInput;
    expect(() => validateInvoiceInput(input)).not.toThrow();
  });
});
