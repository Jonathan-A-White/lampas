// src/gate/licenceContext.ts — what the app reads of the licence (mw-8m9dyu.1): useLicence() is 'licensed' (the chain, or a held
// answer inside the 24 h grace, says so), 'checking' (no answer yet, or a mint still being indexed) or 'not-licensed' (none,
// revoked, or no answer and no grace). LicenceProvider (LicenceProvider.tsx) fills it from the one check.
import { createContext, useContext } from 'react';
import type { Locked } from './Unlock';

export type LicenceState = 'licensed' | 'not-licensed' | 'checking';

export interface LicenceDetail {
  licence: LicenceState;
  /** Why it is not licensed, for the Unlock page. */
  locked: Locked | null;
  publicKeyHex: string;
  checkAgain: () => void;
}

export const LicenceContext = createContext<LicenceDetail | null>(null);

// With no provider (a feature test that draws a screen alone) the app is licensed, as it was behind an open Gate.
// The app always has a provider (src/main.tsx).
export function useLicence(): LicenceState {
  return useContext(LicenceContext)?.licence ?? 'licensed';
}

/** The detail behind useLicence, for the page that shows the phone's key; null with no provider. */
export function useLicenceDetail(): LicenceDetail | null {
  return useContext(LicenceContext);
}
