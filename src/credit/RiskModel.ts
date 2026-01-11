import type { CreditSimulationResult } from './CreditTypes.js';
import type { InvoiceRecord } from '../invoice/InvoiceTypes.js';

/**
 * RiskModel is an extensible interface to plug-in scoring logic.
 * The default implementation is deterministic and conservative; consumers should provide
 * a custom model for production-grade credit decisions (via dependency injection).
 */
export type RiskEvaluator = (invoice: InvoiceRecord) => Promise<CreditSimulationResult>;

export class RiskModel {
  private evaluator: RiskEvaluator;

  constructor(evaluator?: RiskEvaluator) {
    if (evaluator) this.evaluator = evaluator;
    else this.evaluator = this.defaultEvaluator;
  }

  async evaluate(invoice: InvoiceRecord): Promise<CreditSimulationResult> {
    return this.evaluator(invoice);
  }

  // A deterministic fallback evaluator. Conservative defaults based on invoice amount and time-to-due.
  private async defaultEvaluator(invoice: InvoiceRecord): Promise<CreditSimulationResult> {
    const now = Math.floor(Date.now() / 1000);
    const timeToDueDays = Math.max(1, Math.floor((invoice.dueDate - now) / (60 * 60 * 24)));

    // deterministic rules (documented) — these are conservative and should be replaced by an oracle in production
    const base = Math.max(0, 1 - timeToDueDays / 365);

    const borrowingPower = Math.max(0, Math.min(invoice.amount * base * 0.8, invoice.amount * 0.9));

    let tier: 'A' | 'B' | 'C' | 'D' | 'Unknown' = 'Unknown';
    if (borrowingPower >= invoice.amount * 0.8) tier = 'A';
    else if (borrowingPower >= invoice.amount * 0.5) tier = 'B';
    else if (borrowingPower >= invoice.amount * 0.25) tier = 'C';
    else tier = 'D';

    const terms = {
      maxAmount: borrowingPower,
      minAmount: Math.max(0.01, borrowingPower * 0.1),
      maxDurationDays: Math.min(180, Math.max(30, timeToDueDays)),
      aprPercent: 10 + (tier === 'A' ? 2 : tier === 'B' ? 5 : tier === 'C' ? 10 : 20),
    };

    return {
      borrowingPower,
      riskTier: tier,
      expectedLoanTerms: terms,
    };
  }
}
