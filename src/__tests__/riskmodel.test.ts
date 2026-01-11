import { describe, it, expect } from 'vitest';
import { RiskModel } from '../credit/RiskModel.js';
import type { InvoiceRecord } from '../invoice/InvoiceTypes.js';

describe('RiskModel', () => {
  it('returns a CreditSimulationResult for a sample invoice', async () => {
    const model = new RiskModel();
    const invoice = {
      amount: 10,
      recipientWallet: 'B'.repeat(44),
      dueDate: Math.floor(Date.now() / 1000) + 86400 * 30,
      description: 'Test',
      issuerName: 'Issuer',
      issuerWallet: 'C'.repeat(44),
      createdAt: Math.floor(Date.now() / 1000),
      invoiceId: 'deadbeef',
      status: 'pending',
      txSignature: 'sig',
    } as unknown as InvoiceRecord;

    const res = await model.evaluate(invoice);
    expect(res).toHaveProperty('borrowingPower');
    expect(res).toHaveProperty('riskTier');
    expect(res).toHaveProperty('expectedLoanTerms');
  });
});
