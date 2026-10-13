// src/gate/Gate.tsx — a wrapper that shows Unlock until this phone's key holds a lampas licence on chain.
// Lampas itself no longer sits behind it (mw-8m9dyu.1: src/main.tsx wraps the app in LicenceProvider, which only
// reports the answer); the check is src/gate/useLicenceCheck.ts, shared with the provider.
import { type ReactNode } from 'react';
import { Unlock } from './Unlock';
import { useLicenceCheck, type LicenceCheckOptions } from './useLicenceCheck';

interface Props extends LicenceCheckOptions {
  children: ReactNode;
}

export function Gate({ children, ...options }: Props) {
  const { state, publicKeyHex, checkAgain } = useLicenceCheck(options);
  if (state.kind === 'open') return children;
  return <Unlock locked={state} publicKeyHex={publicKeyHex} onCheckAgain={checkAgain} />;
}
