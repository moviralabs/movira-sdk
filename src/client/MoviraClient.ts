import { ConnectionManager } from './ConnectionManager.js';
import type { NetworkConfig } from '../types/CommonTypes.js';
import type { IWalletAdapter } from '../wallet/WalletAdapter.js';
import { InvoiceService } from '../invoice/InvoiceService.js';
import { CreditService } from '../credit/CreditService.js';
import { LoanService } from '../loan/LoanService.js';

/**
 * Main SDK entrypoint
 */
export class MoviraClient {
  public readonly connectionManager: ConnectionManager;
  public readonly wallet: IWalletAdapter;
  public readonly invoice: InvoiceService;
  public readonly credit: CreditService;
  public readonly loan: LoanService;

  private connected = false;

  constructor(config: NetworkConfig, walletAdapter: IWalletAdapter) {
    this.connectionManager = new ConnectionManager(config);
    this.wallet = walletAdapter;
    // Initialize services with references
    this.invoice = new InvoiceService(this.connectionManager, this.wallet);
    this.credit = new CreditService(this.connectionManager, this.wallet, config.oracleEndpoints);
    this.loan = new LoanService(this.connectionManager, this.wallet);
  }

  /**
   * Connect the provided wallet adapter and verify RPC connectivity.
   * - Ensures the wallet is available for signing operations.
   * - Performs a simple RPC call to validate the connection.
   * @throws {MoviraError} if the wallet cannot connect or RPC is unreachable
   */
  async connect(): Promise<void> {
    await this.wallet.connect();
    // Optionally test RPC connectivity
    await this.connectionManager.connection.getVersion();
    this.connected = true;
  }

  /**
   * Disconnect the wallet adapter and clear the connected state.
   */
  async disconnect(): Promise<void> {
    await this.wallet.disconnect();
    this.connected = false;
  }
}
