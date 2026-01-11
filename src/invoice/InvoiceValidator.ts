import { InvoiceInput } from './InvoiceTypes.js';
import { isValidAmount, isValidPublicKeyString, isFutureTimestamp } from '../utils/validation.js';
import { MoviraError, ErrorCode } from '../errors/MoviraError.js';

export function validateInvoiceInput(input: InvoiceInput): void {
  if (!isValidAmount(input.amount)) {
    throw new MoviraError(ErrorCode.INVALID_INPUT, 'Invalid invoice amount', { value: input.amount });
  }

  if (!isValidPublicKeyString(input.recipientWallet)) {
    throw new MoviraError(ErrorCode.INVALID_INPUT, 'Invalid recipient wallet', { value: input.recipientWallet });
  }

  if (!isFutureTimestamp(input.dueDate)) {
    throw new MoviraError(ErrorCode.INVALID_INPUT, 'dueDate must be in the future', { value: input.dueDate });
  }

  // description optional but if present, ensure reasonable length
  if (input.description && input.description.length > 1024) {
    throw new MoviraError(ErrorCode.INVALID_INPUT, 'description too long');
  }
}
