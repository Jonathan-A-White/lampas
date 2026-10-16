// src/useCanHear.ts — whether the phone can hear him say a letter (Say it, mw-86e9r1.12): it has speech recognition (src/services/listen.ts isListenSupported) and the microphone
// is not refused for the page. undefined while the phone is being asked, true or false after. A phone that does not answer the permission question (Safari and Firefox refuse the
// name 'microphone') is taken as able: Say it then finds out at the press, where a refusal skips the question (LetterDrillScreen).
import { useEffect, useState } from 'react';
import { isListenSupported } from './services/listen';

/** True when the page's permission to use the microphone is refused; false when it is not, or when the phone will not say. */
export async function microphoneRefused(): Promise<boolean> {
  try {
    const status = await navigator.permissions?.query({ name: 'microphone' as PermissionName });
    return status?.state === 'denied';
  } catch {
    return false;
  }
}

export function useCanHear(): boolean | undefined {
  const [can, setCan] = useState<boolean | undefined>(() => (isListenSupported() ? undefined : false));
  useEffect(() => {
    if (can !== undefined) return;
    let current = true;
    void microphoneRefused().then((refused) => current && setCan(!refused));
    return () => {
      current = false;
    };
  }, [can]);
  return can;
}
