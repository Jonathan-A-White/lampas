// src/WelcomeBack.tsx — 'Welcome back' (mw-1vuvq6.6, docs/ask-tutor.md 'Rust'): opening the app after a break of BREAK_DAYS or more offers a short refresher of the solid words and
// ideas most overdue. Refresh opens a Review round of just those (src/review/practise.ts); Not now puts the card away for the day. A strip above the screen, drawn once the check is done;
// nothing is asked of him unless he taps. The break is read from the usage log: the latest day before today that has any use.
import { useEffect, useState } from 'react';
import { overdueNow } from './data/learnerRusty';
import { dayOf, lastUsageDayBefore } from './data/repositories';
import { BREAK_DAYS, type RustyCandidate } from './data/rusty';
import { DAY } from './data/schedule';
import { navigate } from './nav/route';
import { setPractise } from './review/practise';
import { greekLang } from './script/greekLang';

/** The local day the card was last answered (Refresh or Not now), in localStorage: it is not shown again that day. */
export const WELCOME_BACK_DAY_KEY = 'lampas.welcomeBackDay';

/** Whole days from one 'YYYY-MM-DD' to another. */
const daysBetween = (from: string, to: string): number => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);

interface Card {
  away: number;
  items: RustyCandidate[];
}

export function WelcomeBack({ hidden = false }: { hidden?: boolean }) {
  const [card, setCard] = useState<Card | null>(null);
  useEffect(() => {
    let live = true;
    void (async () => {
      const today = dayOf(Date.now());
      if (window.localStorage.getItem(WELCOME_BACK_DAY_KEY) === today) return;
      const last = await lastUsageDayBefore(today);
      const away = last === undefined ? 0 : daysBetween(last, today);
      if (away < BREAK_DAYS) return;
      const items = await overdueNow();
      if (live && items.length > 0) setCard({ away, items });
    })().catch((error: unknown) => console.error('could not check for a break', error));
    return () => {
      live = false;
    };
  }, []);
  if (!card || hidden) return null;
  const answered = (): void => {
    window.localStorage.setItem(WELCOME_BACK_DAY_KEY, dayOf(Date.now()));
    setCard(null);
  };
  return (
    <section aria-label="Welcome back" data-welcome-back className="shrink-0 border-b border-line bg-surface px-4 py-3">
      <h2 className="text-lg font-semibold">Welcome back</h2>
      <p className="text-base text-muted">It has been {card.away} days. A short refresher of what you knew well, most overdue first:</p>
      <ul className="my-1 flex flex-wrap items-baseline gap-x-4 text-lg">
        {card.items.map((item) => (
          <li key={`${item.kind}:${item.id}`} {...greekLang(item.kind === 'word')} className={item.kind === 'word' ? 'font-greek text-[length:var(--lp-greek-size)]' : undefined}>
            {item.title}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            answered();
            setPractise(card.items.map(({ kind, id }) => ({ kind, id })));
            navigate('review');
          }}
          className="min-h-11 flex-1 rounded-xl bg-accent text-base font-medium text-accent-fg"
        >
          Refresh
        </button>
        <button type="button" onClick={answered} className="min-h-11 flex-1 rounded-xl border border-line text-base font-medium">
          Not now
        </button>
      </div>
    </section>
  );
}
