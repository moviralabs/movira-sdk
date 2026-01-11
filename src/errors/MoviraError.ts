export enum ErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  NOT_AUTHORIZED = 'NOT_AUTHORIZED',
  NOT_FOUND = 'NOT_FOUND',
  UNKNOWN = 'UNKNOWN'
}

export class MoviraError extends Error {
  public code: ErrorCode;
  public context?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'MoviraError';
    this.code = code;
    this.context = context;
  }
}
