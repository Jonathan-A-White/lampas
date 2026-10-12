// src/gate/LicenceProvider.tsx — the app-wide licence state (mw-8m9dyu.1). Lampas opens for anyone; the licence check
// (src/services/licenceCheck.ts, licenceCache.ts) still runs as it did behind the Gate, and its answer is read through
// useLicence() (licenceContext.ts).
import { useMemo, type ReactNode } from 'react';
import { LicenceContext, type LicenceDetail } from './licenceContext';
import { useLicenceCheck, type LicenceCheckOptions } from './useLicenceCheck';

export function LicenceProvider({ children, ...options }: LicenceCheckOptions & { children: ReactNode }) {
  const { state, publicKeyHex, checkAgain } = useLicenceCheck(options);
  const value = useMemo<LicenceDetail>(
    () => ({
      licence: state.kind === 'open' ? 'licensed' : state.kind === 'checking' ? 'checking' : 'not-licensed',
      locked: state.kind === 'open' ? null : state,
      publicKeyHex,
      checkAgain,
    }),
    [state, publicKeyHex, checkAgain],
  );
  return <LicenceContext.Provider value={value}>{children}</LicenceContext.Provider>;
}
