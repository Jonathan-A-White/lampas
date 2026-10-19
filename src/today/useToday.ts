// src/today/useToday.ts — the local date Today and its Reader chip work on (mw-1fwagb.6), read again when the app comes back to the front.
import { useEffect, useState } from 'react';
import { localDate } from '../data/daily/dailyStore';

/** The local date, read again when the app comes back to the front (a day may have turned over). */
export function useToday(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const again = (): void => setNow((was) => (localDate(was) === localDate(new Date()) ? was : new Date()));
    document.addEventListener('visibilitychange', again);
    window.addEventListener('focus', again);
    return () => {
      document.removeEventListener('visibilitychange', again);
      window.removeEventListener('focus', again);
    };
  }, []);
  return now;
}
