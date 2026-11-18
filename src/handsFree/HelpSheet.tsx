// src/handsFree/HelpSheet.tsx — the sheet the Hands-free mic mark opens (mw-rl10piw.43): 'What you can say', one line a command with the words to say, from the router's one table
// (commands.ts HELP_LINES, the same list 'help' reads aloud). Closes by a tap outside, a swipe down on its handle, Done, Escape or the phone's Back, as the other sheets do.
import { useDoorTarget } from '../tutor/door';
import { useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from '../ui/sheetDrag';
import { HELP_LINES, HELP_TITLE } from './commands';

export function HelpSheet({ onClose }: { onClose: () => void }) {
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose, true);
  useSheetBack(onClose);
  // nothing to ask the tutor about this list: the round ? is not drawn over this sheet
  useDoorTarget(() => undefined, true, true);
  return (
    // z-35 like the other sheets: above the screens, below the full-screen dialogs and the shell bars
    <div className="fixed inset-0 z-35 flex flex-col justify-end">
      <div data-testid="sheet-backdrop" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={HELP_TITLE}
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="relative rounded-t-2xl border-t border-line bg-surface"
      >
        <div data-testid="sheet-handle" {...handle} className="flex min-h-12 touch-none items-center justify-between gap-3 px-4 pt-2">
          <span aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-line" />
          <button type="button" onClick={onClose} className="absolute right-2 top-1 min-h-11 min-w-11 rounded-lg px-3 text-base font-medium text-accent">
            Done
          </button>
        </div>
        <div className="px-4 pb-[calc(1rem+var(--lp-end-inset))] pt-1">
          <h2 className="text-2xl font-bold">{HELP_TITLE}</h2>
          <p className="text-base text-muted">Say &lsquo;Hey Lampas&rsquo;, then one of these.</p>
          <ul aria-label="Commands" className="mt-2 flex max-h-[60dvh] flex-col overflow-y-auto">
            {HELP_LINES.map((line) => (
              <li key={line.name} data-help-line={line.name} className="flex flex-col border-t border-line py-2">
                <span className="text-lg font-semibold">&ldquo;{line.example}&rdquo;</span>
                <span className="text-base text-muted">{line.does}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
