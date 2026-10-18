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
  /** True when the licence was minted by an issuer that is not the Governor's own: the site issuer, whose licences belong to a person with devices (My devices). */
  siteIssued: boolean;
  /** This phone's licence was removed from My devices: it is not licensed at once. */
  removed: () => void;
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

/** Whether the AI (the tutor and everything sent to the mill) may show: only on a licensed phone (mw-8m9dyu.2). While the check is still out, or when it
 * found none, the entry points are not drawn; the gated mill client (src/services/mill.ts) refuses a send in the same cases. */
export function useAiAllowed(): boolean {
  return useLicence() === 'licensed';
}
