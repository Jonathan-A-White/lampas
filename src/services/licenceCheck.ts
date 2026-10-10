// src/services/licenceCheck.ts — asks the chain whether a key holds a lampas licence minted by the issuer.
// All of the rule is bsv-kit's licenceStatus with { issuer }: it reads the issuer's history as well as the
// key's, counts only a mint the issuer signed, and ends a licence on the issuer's signed revoke (Postern's W record).
import { licence } from 'bsv-kit/bsv';
import { CHAIN, COLLECTION, ISSUER } from '../config';
import { dexieTxCache } from '../data/repositories/txCache';

export type LicenceStatus = licence.LicenceStatus;

/** The app is set up in a way that cannot check a licence: not a connection problem, so the gate says what is wrong. */
export class LicenceConfigError extends Error {}

export interface CheckOptions {
  issuer?: string;
  collection?: string;
  chain?: 'testnet' | 'mainnet';
  reader?: licence.ChainReader;
  /** Where the transactions a check reads are kept; the phone's own store, none where there is no IndexedDB (scripts/check-licence.ts under node). */
  txCache?: licence.TransactionCache;
}

/** Throws when the chain cannot be reached, or when no issuer is set. */
export async function fetchLicenceStatus(publicKeyHex: string, options: CheckOptions = {}): Promise<LicenceStatus> {
  const issuer = (options.issuer ?? ISSUER).toLowerCase();
  if (!issuer) throw new LicenceConfigError('No licence issuer is set. Set VITE_LAMPAS_ISSUER for the build.');
  // bsv-kit derives testnet addresses only; a mainnet switch needs bsv-kit to grow one first.
  if ((options.chain ?? CHAIN) !== 'testnet') throw new LicenceConfigError('Only the testnet chain is wired in bsv-kit so far.');

  const reader = options.reader ?? new licence.WhatsOnChainReader();
  const txCache = options.txCache ?? (typeof indexedDB === 'undefined' ? undefined : dexieTxCache);
  return licence.licenceStatus(publicKeyHex, options.collection ?? COLLECTION, { issuer, reader, txCache });
}
