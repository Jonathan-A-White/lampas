// src/tips/HintCard.tsx — draws the tip bsv-kit/tips says is next for an event (src/tips/hints.ts): one quiet line and Got it,
// which dismisses it for good. Nothing at all when there is none, or with the Tips setting Off.
import { useLiveQuery } from 'dexie-react-hooks';
import type { tips } from 'bsv-kit/tips';
import { useEffect, useState } from 'react';
import { getTips } from '../data/repositories';
import { hints } from './hints';

export function HintCard({ event, className }: { event: string; className?: string }) {
  const setting = useLiveQuery(getTips, []);
  const [tip, setTip] = useState<tips.Tip | null>(null);
  useEffect(() => {
    let current = true;
    void hints.nextTip(event).then((next) => current && setTip(next));
    return () => {
      current = false;
    };
  }, [event]);
  if (setting !== 'on' || !tip) return null;
  return (
    <aside role="note" data-hint-card={tip.id} className={`flex items-center gap-2 rounded-xl border border-line px-3 ${className ?? ''}`}>
      <p className="min-w-0 flex-1 py-1 text-sm">
        <span className="font-semibold">Tip: </span>
        {tip.text}
      </p>
      <button
        type="button"
        onClick={() => {
          setTip(null);
          void hints.dismiss(tip.id);
        }}
        className="min-h-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent active:bg-line"
      >
        Got it
      </button>
    </aside>
  );
}
