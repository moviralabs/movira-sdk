export type LoanStatus = 'active' | 'repaid' | 'defaulted' | 'requested' | 'not_found';

export interface LoanRequest {
  invoiceId: string;
  requestedAmount: number; // SOL
  loanDurationDays: number;
  lenderWallet?: string; // optional suggestion
}

export interface LoanRecord extends LoanRequest {
  loanId: string;
  borrowerWallet: string;
  createdAt: number; // epoch seconds
  status: LoanStatus;
  txSignature: string;
}
