// src/services/licenceCache.ts — the last 'held' answer, so an offline open within the grace still unlocks.
import { LICENCE_CACHE_STORAGE_KEY, LICENCE_GRACE_MS } from '../config';

interface Held {
  publicKeyHex: string;
  /** Epoch ms of the check that said held. */
  at: number;
  /** The issuer key (lowercase hex) that signed the mint, when the check said (mw-cvwm1u.5: a site issuer's licence has devices to list). */
  issuer?: string;
}

export function rememberHeld(publicKeyHex: string, now: number, storage: Storage = window.localStorage, issuer?: string): void {
  const held: Held = { publicKeyHex, at: now, ...(issuer ? { issuer } : {}) };
  storage.setItem(LICENCE_CACHE_STORAGE_KEY, JSON.stringify(held));
}

/** Who signed the mint of the licence this key was last found holding, if the check said. */
export function heldIssuer(publicKeyHex: string, storage: Storage = window.localStorage): string | undefined {
  try {
    const held = JSON.parse(storage.getItem(LICENCE_CACHE_STORAGE_KEY) ?? 'null') as Held | null;
    return held && held.publicKeyHex === publicKeyHex && typeof held.issuer === 'string' ? held.issuer : undefined;
  } catch {
    return undefined;
  }
}

export function forgetHeld(storage: Storage = window.localStorage): void {
  storage.removeItem(LICENCE_CACHE_STORAGE_KEY);
}

/** True when this key was found holding a licence within the grace. */
export function heldWithinGrace(
  publicKeyHex: string,
  now: number,
  storage: Storage = window.localStorage,
  graceMs: number = LICENCE_GRACE_MS,
): boolean {
  try {
    const held = JSON.parse(storage.getItem(LICENCE_CACHE_STORAGE_KEY) ?? 'null') as Held | null;
    return !!held && held.publicKeyHex === publicKeyHex && now - held.at >= 0 && now - held.at <= graceMs;
  } catch {
    return false;
  }
}
