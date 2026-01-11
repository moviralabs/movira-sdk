import { Connection } from '@solana/web3.js';
import type { NetworkConfig } from '../types/CommonTypes.js';

/**
 * Manages a Solana Connection instance and basic helpers
 */
export class ConnectionManager {
  public readonly connection: Connection;
  public readonly programId: string;

  constructor(config: NetworkConfig) {
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.programId = config.programId;
  }

  async getRecentBlockhash() {
    return this.connection.getLatestBlockhash('finalized');
  }
}
