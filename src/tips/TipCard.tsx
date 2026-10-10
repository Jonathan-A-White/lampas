// src/tips/TipCard.tsx — the tip of the day. In the Reader it is a small 'Tip' chip in the row under the header (src/ReaderChips.tsx); a tap on the
// chip opens the card below the row. 'Show me' opens the screen the tip is about; 'Not now' puts it away (a tip with no screen has 'Got it' alone).
// Either way its id stays in the tips table, so it is sent as shown and never offered again, and the card closes. Not drawn with Tips Off.
import { dismissTip, type TipRow } from '../data/repositories';
import { navigate, type Route } from '../nav/route';
import { CHIP, CHIP_PLAIN } from '../chipStyle';
import { SCREENS } from './summary';
import { useOpenTip } from './useOpenTip';

export function TipChip({ tip, open, onToggle }: { tip: TipRow | undefined; open: boolean; onToggle: () => void }) {
  if (!tip) return null;
  return (
    <button type="button" data-testid="tip-chip" aria-label={`Tip: ${tip.title}`} aria-expanded={open} onClick={onToggle} className={`${CHIP} ${CHIP_PLAIN}`}>
      Tip
    </button>
  );
}

export function TipCard({ onClose }: { onClose?: () => void }) {
  const tip = useOpenTip();
  if (!tip) return null;
  const screen = SCREENS.find((s) => s.id === tip.action?.screen)?.id;
  const show = (route: Exclude<Route, 'home'>) => {
    void dismissTip(tip.id, 'acted');
    onClose?.();
    navigate(route);
  };
  const button = 'min-h-12 shrink-0 rounded-lg px-4 text-base font-medium active:bg-line';
  return (
    <section data-testid="tip-card" aria-label="Tip" className="shrink-0 border-b border-line bg-surface px-3 py-2">
      <h2 className="text-base font-semibold">{tip.title}</h2>
      <p className="text-base text-muted">{tip.body}</p>
      <div className="flex justify-end gap-1">
        <button type="button" onClick={() => { void dismissTip(tip.id, 'dismissed'); onClose?.(); }} className={`${button} text-fg`}>
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
