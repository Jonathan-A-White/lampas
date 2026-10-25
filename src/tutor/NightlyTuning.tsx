// src/tutor/NightlyTuning.tsx — the nightly tutor-weights run's one try at launch (mw-t3xu9a.8, src/tutor/weightsRun.ts), only for a licensed phone as the tips' sitting is (src/tips/LicensedTips.tsx): the tutor-weights grist goes to the
// mill, which answers a licence only. Drawn once by src/main.tsx inside the licence provider; it waits LAUNCH_DELAY_MS so the first screen is not competing with the facts it reads, and draws nothing.
import { useEffect } from 'react';
import { useLicence } from '../gate/licenceContext';
import { startNightlyTuning, type NightDeps } from './weightsRun';

/** How long after the licence is found the run waits to start. */
export const LAUNCH_DELAY_MS = 10_000;

export function NightlyTuning({ delayMs = LAUNCH_DELAY_MS, deps }: { delayMs?: number; deps?: NightDeps }) {
  const licensed = useLicence() === 'licensed';
  useEffect(() => {
    if (!licensed) return;
    const timer = setTimeout(() => void startNightlyTuning(deps), delayMs);
    return () => clearTimeout(timer);
  }, [licensed, delayMs, deps]);
  return null;
}
