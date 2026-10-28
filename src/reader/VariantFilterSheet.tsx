// src/reader/VariantFilterSheet.tsx — the small sheet a long press on the Reader's variants chip opens (mw-9ji6ek0.5, src/reader/VariantChip.tsx): the two filters of
// Settings > Reading > Variants, which variants (Those that change the English | All; choosing one turns Variants on) and whose readings count (Witnesses), each
// written to its setting at once, and a link to the Variants row of Settings. Done, Back, Escape, a swipe down or a tap outside close it.
import { createPortal } from 'react-dom';
import { variantsSetting, variantWitnessesSetting } from '../settings/definitions';
import { ChipRow } from '../settings/controls/SettingRow';
import { openSetting } from '../settings/link';
import { useSetting } from '../settings/store';
import { focusOnMount } from '../ui/focus';
import { useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from '../ui/sheetDrag';

/** Labels of the setting's own choices, so the sheet says what Settings says. */
const labelsOf = (def: typeof variantsSetting | typeof variantWitnessesSetting, values: readonly string[]): [string, string][] =>
  def.allowed.kind === 'choice' ? def.allowed.values.filter((v) => values.includes(v.value)).map((v) => [v.value, v.label]) : [];

/** How long the link waits for the sheet's own Back entry to be taken off before it opens Settings (jsdom and a phone both answer well within it). */
const LEAVE_WAIT_MS = 400;

function Sheet({ onClose }: { onClose: () => void }) {
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  const variants = useSetting(variantsSetting);
  const witnesses = useSetting(variantWitnessesSetting);
  // the sheet's history entry is taken off as it closes (src/ui/sheetBack.ts): Settings opens once that Back has landed, so it is not undone by it
  const toSettings = () => {
    let gone = false;
    const go = () => {
      if (gone) return;
      gone = true;
      window.removeEventListener('popstate', go);
      openSetting(variantsSetting.key);
    };
    window.addEventListener('popstate', go);
    setTimeout(go, LEAVE_WAIT_MS);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div data-testid="sheet-backdrop" aria-hidden="true" onClick={onClose} className="lp-fade-in absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Variants"
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="lp-sheet-in relative rounded-t-2xl border-t border-line bg-surface px-4 pb-[calc(1rem+var(--lp-bar-inset))]"
      >
        <div data-testid="sheet-handle" {...handle} className="flex touch-none flex-col items-center pt-2">
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-line" />
          <div className="flex min-h-12 w-full items-center gap-2">
            <h2 className="min-w-0 flex-1 text-xl font-semibold">Variants</h2>
            <button type="button" ref={focusOnMount} onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
              Done
            </button>
          </div>
        </div>
        <p className="pb-2 text-base text-muted">Which places where the manuscripts differ the Reader marks.</p>
        <div className="pb-3">
          <ChipRow name="Variants" current={variants ?? 'off'} options={labelsOf(variantsSetting, ['english', 'all'])} settingKey="variants" />
        </div>
        <h3 className="pb-1 text-base font-medium">Witnesses</h3>
        <div className="pb-3">
          <ChipRow name="Witnesses" current={witnesses ?? 'ecm'} options={labelsOf(variantWitnessesSetting, ['byz', 'na', 'ecm'])} settingKey="variantWitnesses" />
        </div>
        <button type="button" onClick={toSettings} className="flex min-h-12 w-full items-center rounded-xl px-1 text-left text-lg font-medium text-accent">
          Variants in Settings
        </button>
      </div>
    </div>
  );
}

/** The sheet, drawn over everything (the chip that opens it is in the Reader's header, which slides). */
export function VariantFilterSheet(props: { onClose: () => void }) {
  return createPortal(<Sheet {...props} />, document.body);
}
