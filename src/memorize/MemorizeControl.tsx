// src/memorize/MemorizeControl.tsx — the one control that puts a verse into memorizing (mw-fu7dqf.5, the epic mw-fu7dqf), drawn on a verse list's row and in the Verse view. 'Memorize' while the verse
// is not memorized: a tap memorizes it in English. 'Memorizing · English' once it is, with 'Practise' beside it (a session on this reference): a tap opens a small sheet with a switch for each language the dial of the verse's own language allows (English, Greek or Hebrew, the Weave)
// and 'Stop memorizing'; at 'Just English' there is no sheet, the tap stops it. It never writes anything itself: every tap goes through src/memorize/commands.ts, which the tutor calls too.
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { memorizedOf } from '../data/repositories/memorize';
import { useInterestLevels } from '../settings/useInterestLevels';
import { announce } from '../ui/live';
import { useEscapeToClose } from '../ui/sheetDrag';
import { useSheetBack } from '../ui/sheetBack';
import { memorizeVerse, printedRef, unmemorizeVerse, type CommandResult } from './commands';
import { languagesFor, langName, MEMORIZE_LANGS, type MemorizeLang } from './languages';
import { openMemorizeSession } from '../nav/route';
import { sourceOf } from './source';

const BUTTON = 'min-h-12 shrink-0 rounded-xl border px-3 font-medium leading-tight';
/** The quiet look of the Verse view's tools line (mw-5r3p30.896): accent words with no border; on, a tint of the accent, never filled. */
const QUIET = 'min-h-11 shrink-0 rounded-lg px-2.5 text-sm font-medium leading-tight';

/** Says what a command did to a screen reader. */
const tell = (done: Promise<CommandResult>): void => void done.then(({ said }) => announce(said)).catch((error) => console.error('could not change what is memorized', error));

function LanguageSheet({ canonical, offered, memorized, onClose }: { canonical: string; offered: readonly MemorizeLang[]; memorized: readonly MemorizeLang[]; onClose: () => void }) {
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  // a language he memorized it in stays on the sheet to be switched off, though the dial has since gone down
  const shown = MEMORIZE_LANGS.filter((lang) => offered.includes(lang) || memorized.includes(lang));
  return (
    <div role="dialog" aria-modal="true" aria-label={`Memorize ${printedRef(canonical)}`} className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40">
      <button type="button" aria-label="Close" tabIndex={-1} onClick={onClose} className="min-h-0 flex-1 cursor-default" />
      <div className="rounded-t-2xl bg-surface px-4 pt-3 pb-[calc(0.75rem+var(--lp-bar-inset))]">
        <h2 className="text-lg font-bold">Memorize {printedRef(canonical)}</h2>
        <p className="text-sm text-muted">Learn it by heart in:</p>
        <ul className="mt-1">
          {shown.map((lang) => {
            const on = memorized.includes(lang);
            return (
              <li key={lang} className="flex min-h-12 items-center justify-between gap-3 border-b border-line">
                <span className="text-base font-medium">{langName(lang)}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={langName(lang)}
                  onClick={() => tell(on ? unmemorizeVerse({ ref: canonical, lang }) : memorizeVerse({ ref: canonical, langs: [lang] }))}
                  className={`min-h-12 min-w-16 rounded-lg px-4 text-base font-medium ${on ? 'bg-accent text-accent-fg' : 'border border-line text-fg'}`}
                >
                  {on ? 'On' : 'Off'}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              tell(unmemorizeVerse({ ref: canonical }));
              onClose();
            }}
            className={`${BUTTON} flex-1 border-line text-base text-bad`}
          >
            Stop memorizing
          </button>
          <button type="button" onClick={onClose} className={`${BUTTON} flex-1 border-line text-base`}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/** `canonical` is the reference the verse list holds: 'Rom.8.28', or a range 'Rom.8.28-30'. `compact` is for a list's row, where it shares the line with the reference: a smaller, narrower
 *  button whose label wraps; `quiet` is the Verse view's tools line (QUIET). Draws nothing until it has read what is memorized and where his Greek dial is. */
export function MemorizeControl({ canonical, compact = false, quiet = false, className = '' }: { canonical: string; compact?: boolean; quiet?: boolean; className?: string }) {
  const found = useLiveQuery(() => memorizedOf([canonical]), [canonical]);
  const levels = useInterestLevels();
  const [sheet, setSheet] = useState(false);
  if (found === undefined || levels === undefined) return null;
  const memorized = found.get(canonical) ?? [];
  // the languages of the verse's own dial (Hebrew for an Old Testament verse, Greek for a New Testament one); at 'Just English' no sheet, a tap on it stops it
  const offered: MemorizeLang[] = languagesFor(levels, sourceOf(canonical));
  const on = memorized.length > 0;
  const tap = () => {
    if (!on) {
      setSheet(false);
      tell(memorizeVerse({ ref: canonical, langs: ['en'] }));
    }
    else if (offered.length === 1) tell(unmemorizeVerse({ ref: canonical }));
    else setSheet(true);
  };
  const button = (
    <button
      type="button"
      data-memorize={canonical}
      aria-haspopup={on && offered.length > 1 ? 'dialog' : undefined}
      onClick={tap}
      className={
        quiet
          ? `${QUIET} ${on ? 'bg-accent/15 text-fg' : 'text-accent active:bg-line'} ${className}`
          : `${BUTTON} ${compact ? 'w-36 text-sm' : 'text-base'} ${on ? 'border-accent bg-accent text-accent-fg' : 'border-line text-accent active:bg-line'} ${className}`
      }
    >
      {on ? `Memorizing · ${memorized.map(langName).join(', ')}` : 'Memorize'}
    </button>
  );
  // Practise (mw-fu7dqf.15, PROVISIONAL wording; 'Rehearse' in the Verse view's tools line, where Practise is the action of the row, mw-5r3p30.899): once it is memorized, one tap opens a session on exactly this reference, in the first language it is memorized in. It stands beside the
  // control, so the first tap on Memorize only marks (a tap on a button never leaves the screen by surprise) and the way to practise appears right after.
  const practise = on ? (
    <button
      type="button"
      data-practise={canonical}
      aria-label={compact ? `Practise ${printedRef(canonical)}` : undefined}
      onClick={() => openMemorizeSession(canonical, memorized[0])}
      className={quiet ? `${QUIET} text-accent active:bg-line` : `${BUTTON} ${compact ? 'w-36 text-sm' : 'text-base'} border-line text-accent active:bg-line`}
    >
      {quiet ? 'Rehearse' : 'Practise'}
    </button>
  ) : null;
  return (
    <>
      {compact ? (
        <div className="flex shrink-0 flex-col gap-1">
          {button}
          {practise}
        </div>
      ) : (
        <>
          {button}
          {practise}
        </>
      )}
      {sheet && on ? <LanguageSheet canonical={canonical} offered={offered} memorized={memorized} onClose={() => setSheet(false)} /> : null}
    </>
  );
}
