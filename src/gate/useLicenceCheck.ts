// src/gate/useLicenceCheck.ts — asks the chain whether this phone's key holds a lampas licence, and keeps the answer:
// the one check the Gate (which locks the app on it) and the LicenceProvider (which only reports it) both run.
// A 'held' answer is remembered for a grace (24 h), so an offline open, or a flaky lookup, does not lose the licence;
// none and revoked end it at once. Checks on open, on coming back into view, and on checkAgain; 'indexing'
// (a mint still being indexed) stays 'checking' and retries.
import { useEffect, useState } from 'react';
import { ISSUER } from '../config';
import { getOrCreateDeviceKey } from '../services/deviceKey';
import { forgetHeld, heldIssuer, heldWithinGrace, rememberHeld } from '../services/licenceCache';
import { LicenceConfigError, fetchLicenceStatus, type LicenceStatus } from '../services/licenceCheck';
import type { Locked } from './Unlock';

export interface LicenceCheckOptions {
  /** Defaults to the configured issuer (src/config.ts). */
  issuer?: string;
  /** Asks the chain about a public key; defaults to the real lookup. Tests pass a stub. */
  check?: (publicKeyHex: string) => Promise<LicenceStatus>;
  now?: () => number;
  /** The wait before asking again while a licence is still being indexed. */
  retryMs?: number;
}

/** `issuer` is the key that signed the licence's mint, when known. */
export type CheckState = { kind: 'open'; issuer?: string } | Locked;

export interface LicenceCheck {
  state: CheckState;
  publicKeyHex: string;
  /** Goes back to 'checking' and asks the chain again. */
  checkAgain: () => void;
  /** This phone's licence was taken back by the person removing it (My devices): not licensed at once, without waiting for the chain. */
  removed: () => void;
}

export function useLicenceCheck({ issuer = ISSUER, check, now = Date.now, retryMs = 15_000 }: LicenceCheckOptions): LicenceCheck {
  const [{ publicKeyHex }] = useState(() => getOrCreateDeviceKey());
  // A held answer still inside the grace is open at once; the check below then confirms or locks it.
  const [state, setState] = useState<CheckState>(() => (heldWithinGrace(publicKeyHex, now()) ? { kind: 'open', issuer: heldIssuer(publicKeyHex) } : { kind: 'checking' }));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    let seq = 0;
    let timer: number | undefined;

    async function run(): Promise<void> {
      const mine = ++seq;
      window.clearTimeout(timer);
      let status: LicenceStatus;
      try {
        status = await (check ? check(publicKeyHex) : fetchLicenceStatus(publicKeyHex, { issuer }));
      } catch (error) {
        if (!live || mine !== seq) return;
        if (heldWithinGrace(publicKeyHex, now())) setState({ kind: 'open', issuer: heldIssuer(publicKeyHex) });
        else setState({ kind: 'error', setup: error instanceof LicenceConfigError ? error.message : undefined });
        return;
      }
      if (!live || mine !== seq) return;
      if (status.state === 'held') {
        rememberHeld(publicKeyHex, now(), undefined, status.issuer);
        setState({ kind: 'open', issuer: status.issuer?.toLowerCase() });
      } else if (status.state === 'indexing') {
        setState({ kind: 'checking' });
        timer = window.setTimeout(() => void run(), retryMs);
      } else {
        forgetHeld();
        setState({ kind: status.state });
      }
    }

    const onVisible = () => {
      if (document.visibilityState !== 'hidden') void run();
    };
    document.addEventListener('visibilitychange', onVisible);
    void run();
    return () => {
      live = false;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [publicKeyHex, issuer, check, now, retryMs, attempt]);

  return {
    state,
    publicKeyHex,
    checkAgain: () => {
      setState({ kind: 'checking' });
      setAttempt((n) => n + 1);
    },
    removed: () => {
      forgetHeld();
      setState({ kind: 'revoked' });
    },
  };
}
