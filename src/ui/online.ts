// src/ui/online.ts — what the screens say when a passage cannot be fetched (mw-lcv9z3g.4): 'offline' only on the browser's word (navigator.onLine === false), never on a failed fetch
// alone (his screenshot: 'you are offline' with 4G in the status bar); otherwise the passage 'could not be fetched'. Either way KeepOnPhoneLink (KeepOnPhoneLink.tsx) offers the Keep on this phone setting.
import { useEffect, useState } from 'react';

/** True unless the browser says it is offline; follows the browser's online and offline events. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine !== false);
  useEffect(() => {
    const update = (): void => setOnline(navigator.onLine !== false);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

/** The line for a passage `title` that cannot be had: offline only when the browser says so. */
export const fetchFailedLine = (title: string, online: boolean): string =>
  online ? `${title} could not be fetched.` : `${title} is not on this phone yet, and you are offline.`;
