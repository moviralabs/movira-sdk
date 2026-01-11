import { ConnectionManager } from '../client/ConnectionManager.js';
import type { IWalletAdapter } from '../wallet/WalletAdapter.js';
import fetch from 'node-fetch';
import type { CreditSimulationResult } from './CreditTypes.js';
import { RiskModel } from './RiskModel.js';
import type { InvoiceRecord } from '../invoice/InvoiceTypes.js';
import { MoviraError, ErrorCode } from '../errors/MoviraError.js';

export class CreditService {
  private model: RiskModel;
  private oracleEndpoints?: string[];

  constructor(conn: ConnectionManager, wallet: IWalletAdapter, oracleEndpoints?: string[]) {
    // default risk model can be overridden later
    this.model = new RiskModel();
    this.oracleEndpoints = oracleEndpoints;
  }

  /**
   * Simulate credit for a given invoice.
   * - Attempts to query configured oracle endpoints first (first-success wins).
   * - Falls back to the local RiskModel for deterministic results if no oracle responds.
   * @param invoice {InvoiceRecord}
   * @returns {Promise<CreditSimulationResult>} borrowing power, risk tier and expected terms
   */
  async simulateCredit(invoice: InvoiceRecord): Promise<CreditSimulationResult> {
    // Try oracles (first responder wins)
    if (this.oracleEndpoints && this.oracleEndpoints.length > 0) {
      for (const url of this.oracleEndpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({ invoiceId: invoice.invoiceId }),
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000,
          } as any);
          if (!res.ok) continue;
          const payload = await res.json();
          // Expect payload to conform to CreditSimulationResult — validate shape minimally
          if (payload?.borrowingPower && payload?.riskTier && payload?.expectedLoanTerms) {
            return payload as CreditSimulationResult;
          }
        } catch (e) {
          // try next oracle
          continue;
        }
      }
    }

    // Fallback to local model
    try {
      return await this.model.evaluate(invoice);
    } catch (e: any) {
      throw new MoviraError(ErrorCode.UNKNOWN, 'Failed to evaluate credit', { error: e?.message });
    }
  }

  /**
   * Submit a credit evaluation to an off-chain endpoint.
   * Note: the SDK does not perform cryptographic signing of the payload by default — callers should attach signatures where required by their backend.
   * @param params { invoice: InvoiceRecord; endpoint: string }
   * @returns {Promise<{ success: boolean; response?: unknown }>}
   */
  async submitCreditEvaluation({ invoice, endpoint }: { invoice: InvoiceRecord; endpoint: string }): Promise<{ success: boolean; response?: unknown }> {
    if (!endpoint) throw new MoviraError(ErrorCode.INVALID_INPUT, 'endpoint required');

    // Build evaluation payload
    const evaluation = await this.simulateCredit(invoice);
    const signedPayload = {
      invoiceId: invoice.invoiceId,
      evaluation,
      timestamp: Math.floor(Date.now() / 1000),
    };

    // For explicit wallet signature, the SDK expects the caller to supply a separate signing flow
    // (We intentionally do not sign here with the wallet because wallet.signMessage is not part of the minimal adapter)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(signedPayload),
        headers: { 'Content-Type': 'application/json' },
      } as any);
      return { success: res.ok, response: await res.json().catch(() => null) };
    } catch (e: any) {
      throw new MoviraError(ErrorCode.NETWORK_ERROR, 'Failed to submit credit evaluation', { endpoint, error: e?.message });
    }
  }
}
