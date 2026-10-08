// src/useKnownTerms.ts — the grammar terms he marked I know this, for any sheet that shows a term: read from the store when the
// sheet opens, and kept current by the grammar-term-known events, so a mark made on one sheet shows on every other.
import { useEffect, useState } from 'react';
import { listKnownTerms, setTermKnown } from './data/repositories';
import { publish, subscribe } from './events/bus';

/** Marks `term` known, or takes the mark off, and says so on the bus (grammar-term-known). */
export async function markTermKnown(term: string, known: boolean): Promise<void> {
  await setTermKnown(term, known);
  publish({ kind: 'grammar-term-known', term, known });
}

export function useKnownTerms(): ReadonlySet<string> {
  const [known, setKnown] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => {
    let alive = true;
    void listKnownTerms().then((terms) => {
      if (alive) setKnown((now) => new Set([...terms, ...now]));
    });
    const off = subscribe('grammar-term-known', (event) =>
      setKnown((now) => {
        const next = new Set(now);
        if (event.known) next.add(event.term);
        else next.delete(event.term);
        return next;
      }),
    );
    return () => {
      alive = false;
      off();
    };
  }, []);
  return known;
}
