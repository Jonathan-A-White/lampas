// src/tips/TipCard.tsx — the tip of the day, a small quiet card under the Reader's header strips (the header has no room for it at 360 px).
// 'Show me' opens the screen the tip is about; 'Not now' puts it away (a tip with no screen has 'Got it' alone). Either way its id stays
// in the tips table, so it is sent as shown and never offered again. Not drawn with Tips Off. PROVISIONAL: its place.
import { useLiveQuery } from 'dexie-react-hooks';
import { dismissTip, getTips, openTip } from '../data/repositories';
import { navigate, type Route } from '../nav/route';
import { SCREENS } from './summary';

export function TipCard() {
  const tips = useLiveQuery(getTips, []);
  const tip = useLiveQuery(openTip, []);
  if (tips !== 'on' || !tip) return null;
  const screen = SCREENS.find((s) => s.id === tip.action?.screen)?.id;
  const show = (route: Exclude<Route, 'home'>) => {
    void dismissTip(tip.id, 'acted');
    navigate(route);
  };
  const button = 'min-h-12 shrink-0 rounded-lg px-4 text-base font-medium active:bg-line';
  return (
    <section data-testid="tip-card" aria-label="Tip" className="shrink-0 border-b border-line bg-surface px-3 py-2">
      <h2 className="text-base font-semibold">{tip.title}</h2>
      <p className="text-base text-muted">{tip.body}</p>
      <div className="flex justify-end gap-1">
        <button type="button" onClick={() => void dismissTip(tip.id, 'dismissed')} className={`${button} text-fg`}>
          {screen ? 'Not now' : 'Got it'}
        </button>
        {screen ? (
          <button type="button" onClick={() => show(screen)} className={`${button} bg-accent text-accent-fg`}>
            Show me
          </button>
        ) : null}
      </div>
    </section>
  );
}
