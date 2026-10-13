// src/services/licenceNow.ts — the licence state as the non-React code reads it (mw-8m9dyu.2): the gated mill client (mill.ts) has no hook to ask.
// LicenceProvider (src/gate/LicenceProvider.tsx) keeps it current from the one check; with no provider (a feature test that draws a screen alone, a
// service called from a unit test) the phone counts as licensed, the same default as useLicence().
import type { LicenceState } from '../gate/licenceContext';

let current: LicenceState = 'licensed';

/** What the licence check last said, for the mill client. */
export const currentLicence = (): LicenceState => current;

/** Called by LicenceProvider with each state of the check, and with 'licensed' when it goes. */
export function setCurrentLicence(state: LicenceState): void {
  current = state;
}
