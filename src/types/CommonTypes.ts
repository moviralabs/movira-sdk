/**
 * Common types used across the Movira SDK
 */

export type PublicKeyString = string; // base58-encoded public key

export type UnixTimestamp = number; // seconds since epoch

export interface NetworkConfig {
  rpcUrl: string;
  programId: PublicKeyString; // on-chain program handling Movira data (PDA derivations)
  oracleEndpoints?: string[]; // optional oracle urls
}
