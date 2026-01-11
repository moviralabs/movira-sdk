export type RiskTier = 'A' | 'B' | 'C' | 'D' | 'Unknown';

export interface ExpectedLoanTerms {
  maxAmount: number; // in SOL
  minAmount: number;
  maxDurationDays: number;
  aprPercent: number; // annualized
}

export interface CreditSimulationResult {
  borrowingPower: number;
  riskTier: RiskTier;
  expectedLoanTerms: ExpectedLoanTerms;
}
