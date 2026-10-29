// src/reader/offlineWords.ts — what a screen says when a passage cannot be fetched (mw-lcv9z3g.4): 'you are offline' only on the browser's word (navigator.onLine false), else that the
// passage 'could not be fetched'; the link that goes with it is src/reader/KeepOnPhoneLink.tsx.
import { useEffect, useState } from 'react';

/** Whether the browser says it is online; follows the browser's online and offline events. */
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

/** The words for a place that could not be fetched: offline only when the browser says so. */
export function notFetched(title: string, online: boolean = navigator.onLine !== false): string {
  return online ? `${title} could not be fetched.` : `${title} is not on this phone yet, and you are offline.`;
}
