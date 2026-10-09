// src/IdeaSheet.tsx — the sheet that teaches one grammar idea (mw-hqd5bz.7), opened by Learn this idea on a Grammar sheet: the idea's
// title and plain text, up to three example forms from the goal passage (or, with no goal, the open chapter) with their verses, a
// speaker on each, and a tap opens the word; for a case or a tense, a paradigm table built from the passage's own forms. At the foot
// Got it (frontier, due tomorrow), I know this (solid, the 30-day step) and Ask the tutor; the level shows as a chip.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { loadChapter, loadIndex, wordGloss, type Chapter, type GreekWord } from './data/chapter';
import { ideaExamples, ideaPassage, paradigmOf, type IdeaExample, type IdeaPassage, type Paradigm } from './data/grammar/ideaSheet';
import type { GrammarIdea } from './data/grammar/ladder';
import { getOpenChapter } from './data/readerChapter';
import { getLevel, getSavedGoalText, teachIdea, type GrammarLevelName, type IdeaOutcome } from './data/repositories';
import { SpeakButton } from './speech/SpeakButton';
import { focusOnMount } from './ui/focus';
import { useSheetBack } from './ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from './ui/sheetDrag';

// Each button is as wide as its label and shares the rest, so none of the three wraps at 390 px.
const BUTTON = 'min-h-12 flex-auto whitespace-nowrap rounded-xl border px-2 text-base font-medium';
const LEVEL_NAMES: Record<GrammarLevelName, string> = { solid: 'Solid', frontier: 'Frontier', notYet: 'Not yet' };
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** 'today', a weekday for the last six days, else '3 Oct'. */
function sinceText(since: number, now = Date.now()): string {
  const [then, today] = [new Date(since), new Date(now)];
  const days = Math.round((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(then.getFullYear(), then.getMonth(), then.getDate())) / DAY_MS);
  if (days <= 0) return 'today';
  return days < 7 ? WEEKDAYS[then.getDay()] : `${then.getDate()} ${MONTHS[then.getMonth()]}`;
}

type Loaded = { passage: IdeaPassage } | 'failed' | null;

/** The passage the examples come from: the saved goal's, else the open chapter. */
function usePassage(): Loaded {
  const [loaded, setLoaded] = useState<Loaded>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const text = await getSavedGoalText();
        const index = text ? await loadIndex().catch(() => undefined) : undefined;
        const passage = await ideaPassage(text, getOpenChapter(), loadChapter, index);
        if (alive) setLoaded({ passage });
      } catch {
        if (alive) setLoaded('failed');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  return loaded;
}

function ParadigmTable({ table }: { table: Paradigm }) {
  return (
    <div data-testid="idea-paradigm" className="mt-4">
      <p className="text-sm text-muted">{table.title}</p>
      <table className="mt-1 w-full table-fixed border-collapse text-center">
        <caption className="sr-only">{table.title}</caption>
        <thead>
          <tr>
            <td />
            {table.columns.map((column) => (
              <th key={column} scope="col" className="px-1 pb-1 text-sm font-normal text-muted">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.label} className="border-t border-line">
              <th scope="row" className="py-2 pr-1 text-left text-sm font-normal text-muted">
                {row.label}
              </th>
              {row.cells.map((cell, i) => (
                <td key={table.columns[i]} data-cell={table.columns[i]} lang="grc" className="py-2 font-greek text-xl">
                  {cell ?? <span aria-label="not in this passage" className="text-muted">–</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="pt-1 text-sm text-muted">Forms from the passage; – is a form it does not have.</p>
    </div>
  );
}

function Example({ example, onWord }: { example: IdeaExample; onWord: (chapter: Chapter, word: GreekWord) => void }) {
  const { word, chapter, reference } = example;
  return (
    <li className="flex items-center gap-1">
      <button
        type="button"
        data-testid="idea-example"
        data-form={word.t}
        data-lemma={word.l}
        onClick={() => onWord(chapter, word)}
        className="flex min-h-12 min-w-0 flex-1 items-center justify-between gap-3 rounded-xl border border-line px-3 py-1 text-left active:bg-line"
      >
        <span lang="grc" className="font-greek text-2xl">
          {word.t}
        </span>
        <span className="min-w-0 flex-1 truncate text-base text-muted">{wordGloss(chapter, word)}</span>
        <span data-testid="idea-verse" className="shrink-0 text-sm text-muted">
          {reference}
        </span>
      </button>
      <SpeakButton text={word.t} id={`idea:${word.t}`} label={`Hear ${word.t}`} kind="speaker" className="shrink-0" />
    </li>
  );
}

export function IdeaSheet({ idea, onClose, onWord, onAsk }: {
  idea: GrammarIdea;
  onClose: () => void;
  /** an example was tapped: its chapter, so the word's parsing and meaning can be read */
  onWord: (chapter: Chapter, word: GreekWord) => void;
  /** Ask the tutor, with the idea's first term (its title when it covers none); the button is left out when the screen cannot send it */
  onAsk?: (term: string) => void;
}) {
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  const loaded = usePassage();
  const level = useLiveQuery(() => getLevel(idea.id), [idea.id]);
  const busy = useRef(false);
  const passage = loaded && loaded !== 'failed' ? loaded.passage : undefined;
  const examples = passage ? ideaExamples(idea.id, passage.chapters, passage.verse) : [];
  const table = passage ? paradigmOf(idea, passage.chapters, passage.verse) : null;

  const teach = (outcome: IdeaOutcome): void => {
    if (busy.current) return;
    busy.current = true;
    void teachIdea(idea.id, outcome).finally(() => {
      busy.current = false;
    });
  };
  const pressed = (name: GrammarLevelName): boolean => level?.level === name;

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div data-testid="idea-backdrop" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Idea"
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="relative flex max-h-[92dvh] flex-col rounded-t-2xl border-t border-line bg-surface"
      >
        <div data-testid="idea-handle" {...handle} className="flex min-h-12 shrink-0 touch-none items-center justify-between gap-3 px-4 pt-2">
          <span aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-line" />
          <button type="button" ref={focusOnMount} onClick={onClose} className="absolute right-2 top-1 min-h-11 min-w-11 rounded-lg px-3 text-base font-medium text-accent">
            Done
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 pt-1">
          <h2 className="pr-14 text-2xl font-bold">{idea.title}</h2>
          {level ? (
            <p data-testid="idea-level" className="mt-1 inline-block rounded-full border border-line px-3 py-1 text-sm text-muted">
              {LEVEL_NAMES[level.level]} since {sinceText(level.since)}
            </p>
          ) : null}
          <p data-testid="idea-text" className="mt-2 text-lg">
            {idea.text}
          </p>
          {loaded === null ? (
            <p data-testid="idea-loading" className="mt-3 text-base text-muted">
              Finding examples…
            </p>
          ) : loaded === 'failed' ? (
            <p className="mt-3 text-base text-muted">Could not load the passage, and you may be offline.</p>
          ) : (
            <>
              <div className="mt-3">
                <p className="text-sm text-muted">Examples from {loaded.passage.title}</p>
                {examples.length ? (
                  <ul className="space-y-2 pt-1">
                    {examples.map((example) => (
                      <Example key={`${example.reference}:${example.word.t}`} example={example} onWord={onWord} />
                    ))}
                  </ul>
                ) : (
                  <p className="pt-1 text-base text-muted">No word of {loaded.passage.title} has this idea in its parsing.</p>
                )}
              </div>
              {table ? <ParadigmTable table={table} /> : null}
            </>
          )}
        </div>
        <div className="flex shrink-0 gap-2 border-t border-line px-4 pt-2 pb-[calc(0.75rem+var(--lp-bar-inset))]">
          <button
            type="button"
            aria-pressed={pressed('frontier')}
            onClick={() => teach('got-it')}
            className={`${BUTTON} ${pressed('frontier') ? 'border-accent bg-accent text-accent-fg' : 'border-line text-accent active:bg-line'}`}
          >
            Got it
          </button>
          <button
            type="button"
            aria-pressed={pressed('solid')}
            onClick={() => teach('known')}
            className={`${BUTTON} ${pressed('solid') ? 'border-accent bg-accent text-accent-fg' : 'border-line text-accent active:bg-line'}`}
          >
            I know this
          </button>
          {onAsk ? (
            <button type="button" onClick={() => onAsk(idea.terms[0] ?? idea.title)} className={`${BUTTON} border-line text-accent active:bg-line`}>
              Ask the tutor
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
