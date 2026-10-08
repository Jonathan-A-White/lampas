// src/services/licenceCheck.ts — asks the chain whether a key holds a lampas licence minted by the issuer.
// bsv-kit's licenceStatus finds a mint naming the key; this adds the issuer rule it has no input for: the
// mint's transaction must be signed by the issuer's key (a scriptSig that pushes the issuer's public key,
// as Postern's issuedLicences reads it), or anyone could mint themselves a 'lampas' licence.
import { Transaction, Utils } from '@bsv/sdk';
import { licence } from 'bsv-kit/bsv';
import { CHAIN, COLLECTION, ISSUER } from '../config';

export type LicenceStatus = licence.LicenceStatus;

/** The app is set up in a way that cannot check a licence: not a connection problem, so the gate says what is wrong. */
export class LicenceConfigError extends Error {}

export interface CheckOptions {
  issuer?: string;
  collection?: string;
  chain?: 'testnet' | 'mainnet';
  reader?: licence.ChainReader;
}

function signedBy(txHex: string, publicKeyHex: string): boolean {
  return Transaction.fromHex(txHex).inputs.some((input) =>
    (input.unlockingScript?.chunks ?? []).some((chunk) => chunk.data !== undefined && Utils.toHex(chunk.data) === publicKeyHex),
  );
}

/** Throws when the chain cannot be reached, or when no issuer is set. */
export async function fetchLicenceStatus(publicKeyHex: string, options: CheckOptions = {}): Promise<LicenceStatus> {
  const issuer = (options.issuer ?? ISSUER).toLowerCase();
  if (!issuer) throw new LicenceConfigError('No licence issuer is set. Set VITE_LAMPAS_ISSUER for the build.');
  // bsv-kit derives testnet addresses only; a mainnet switch needs bsv-kit to grow one first.
  if ((options.chain ?? CHAIN) !== 'testnet') throw new LicenceConfigError('Only the testnet chain is wired in bsv-kit so far.');

  const reader = options.reader ?? new licence.WhatsOnChainReader();
  const status = await licence.licenceStatus(publicKeyHex, options.collection ?? COLLECTION, { reader });
  if (status.state !== 'held' && status.state !== 'revoked') return status;
  // A mint someone else made naming this key is no licence at all.
  const fromIssuer = signedBy(await reader.getTransactionHex(status.outpoint.txid), issuer);
  return fromIssuer ? status : { state: 'none', checkedAt: status.checkedAt };
}
