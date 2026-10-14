// src/IdeaSheet.tsx — the sheet that teaches one grammar idea (mw-hqd5bz.7), opened by Learn this idea on a Grammar sheet: the idea's
// title and plain text, up to three example forms from the goal passage (or, with no goal, the open chapter) with their verses (an idea of
// spelling, such as the alphabet, a pair of vowels or a breathing, shows more words with the letters it is about marked), a
// speaker on each, and a tap opens the word; for a case or a tense, a paradigm table built from the passage's own forms; for an idea of the letters,
// sounds and marks (the alphabet, a pair of vowels, a breathing ...), the items as tiles above the text, each to hear (TeachTiles). At the foot
// the level SLIDER (mw-i7xe0n.3: Not yet · Learning · I know it, resting on the idea's level; Learning is frontier and due tomorrow; I know it opens Drill it
// to prove it, and only a pass keeps it there), 'Mark known without a drill' (solid, the 30-day step), a Drill it button and Ask the tutor; the level shows as a chip
// ('Proved by drill' once a run proved it). He learns one idea at a time (mw-i7xe0n.6): sliding to Learning while another idea is Learning asks 'You are learning <other>.
// Switch to <this>?' (Switch | Keep <other>). The sheet teaches only its own idea and takes the ideas under it to be solid: when one is not, it says so above the
// text with a button to go there, and sliding up first asks 'Go to <title> first?'.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { loadChapter, loadIndex, type Chapter, type GreekWord } from './data/chapter';
import { unmetNeed } from './data/grammar/drillIt';
import { exampleMeaning, ideaExamples, ideaPassage, isSpellingIdea, paradigmOf, type IdeaExample, type IdeaPassage, type Paradigm } from './data/grammar/ideaSheet';
import { ideaOf, type GrammarIdea } from './data/grammar/ladder';
import { ideaText } from './data/grammar/lessons';
import { teachTiles } from './data/grammar/teachTiles';
import { getOpenChapter } from './data/readerChapter';
import { getGreekPronunciation, getLevel, getSavedGoalText, listLevels, recordDrill, teachIdea, type DrillMode, type FrontierChoice, type GrammarLevelName, type IdeaOutcome } from './data/repositories';
import { DrillItScreen } from './DrillItScreen';
import { chosenPronunciation } from './speech/greek';
import { pronunciationOf } from './speech/pronunciation';
import { SpeakButton } from './speech/SpeakButton';
import { TeachTiles } from './TeachTiles';
import { focusOnMount } from './ui/focus';
import { useSheetBack } from './ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from './ui/sheetDrag';

// Each button is as wide as its label and shares the rest, so neither wraps at 390 px.
const BUTTON = 'min-h-12 flex-auto whitespace-nowrap rounded-xl border px-2 text-base font-medium';
const LEVEL_NAMES: Record<GrammarLevelName, string> = { solid: 'Solid', frontier: 'Frontier', notYet: 'Not yet' };
/** The slider's three stops, left to right: the level each is and what it is called (PROVISIONAL names). */
const STOPS: { level: GrammarLevelName; label: string }[] = [
  { level: 'notYet', label: 'Not yet' },
  { level: 'frontier', label: 'Learning' },
  { level: 'solid', label: 'I know it' },
];
const OUTCOME_OF_STOP: (IdeaOutcome | null)[] = ['not-yet', 'got-it', null];
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
          {example.parts.map((part, i) =>
            part.marked ? (
              <span key={i} data-marked className="font-bold text-accent underline decoration-2 underline-offset-4">
                {part.text}
              </span>
            ) : (
              part.text
            ),
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-base text-muted">{exampleMeaning(chapter, example.verse, word)}</span>
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
  // the lesson of a sound is the chosen pronunciation's (mw-5r3p30.229); until the saved choice is read, the one the speaker already holds
  const chosen = useLiveQuery(getGreekPronunciation, []);
  const scheme = chosen === undefined ? chosenPronunciation() : pronunciationOf(chosen);
  // the writes follow one another: a second move made while the first is being written waits for it, and is not lost
  const writing = useRef<Promise<unknown>>(Promise.resolve());
  // a tile's own idea sheet opens over this one
  const [opened, setOpened] = useState<GrammarIdea | null>(null);
  const tiles = teachTiles(idea, scheme);
  const passage = loaded && loaded !== 'failed' ? loaded.passage : undefined;
  const examples = passage ? ideaExamples(idea.id, passage.chapters, passage.verse) : [];
  const table = passage ? paradigmOf(idea, passage.chapters, passage.verse) : null;

  // the idea under this one that is not solid yet, the lowest (the sheet teaches only its own idea)
  const levels = useLiveQuery(listLevels, []);
  const builtOn = levels ? unmetNeed(idea.id, new Map([...levels].map(([id, row]) => [id, row.level]))) : null;
  const need = builtOn === null ? null : ideaOf(builtOn);

  const rest = Math.max(0, STOPS.findIndex((stop) => stop.level === level?.level));
  // where he moved the slider to, until the level it moved from changes (the write has landed) or he is sent back
  const [moved, setMoved] = useState<{ to: number; from: number } | null>(null);
  // while the thumb is being dragged the stops it passes are not chosen: only where it is let go is
  const [dragged, setDragged] = useState<number | null>(null);
  const dragging = useRef(false);
  const shown = dragged ?? (moved && moved.from === rest ? moved.to : rest);
  const [drill, setDrill] = useState<DrillMode | null>(null);
  const [asking, setAsking] = useState<{ to: number; need: GrammarIdea } | null>(null);
  // the idea he is learning now, when he slid this one to Learning: one idea at a time, so he chooses (mw-i7xe0n.6)
  const [switching, setSwitching] = useState<GrammarIdea | null>(null);

  const teach = (outcome: IdeaOutcome, choice?: FrontierChoice): void => {
    writing.current = writing.current
      .then(async () => {
        const result = await teachIdea(idea.id, outcome, undefined, 'sheet', choice);
        if (result.status === 'busy') setSwitching(ideaOf(result.other));
      })
      .catch((error: unknown) => console.error('could not keep the level', error));
  };
  const goOn = (to: number): void => {
    setAsking(null);
    const outcome = OUTCOME_OF_STOP[to];
    if (outcome) teach(outcome);
    else setDrill('prove');
  };
  const slideTo = (to: number): void => {
    if (to === rest) return setMoved(null);
    setMoved({ to, from: rest });
    if (to > 0 && need) setAsking({ to, need });
    else goOn(to);
  };
  const stepBy = (event: KeyboardEvent<HTMLInputElement>): void => {
    const to = { ArrowRight: shown + 1, ArrowUp: shown + 1, ArrowLeft: shown - 1, ArrowDown: shown - 1, Home: 0, End: STOPS.length - 1 }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    slideTo(Math.min(STOPS.length - 1, Math.max(0, to)));
  };
  const letGo = (): void => {
    dragging.current = false;
    if (dragged !== null) slideTo(dragged);
    setDragged(null);
  };
  const closeDrill = (): void => {
    setDrill(null);
    setMoved(null);
  };
  const markKnown = (): void => teach('known');

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
              {level.level === 'solid' && level.how === 'drill' ? 'Proved by drill' : `${LEVEL_NAMES[level.level]} since`} {sinceText(level.since)}
            </p>
          ) : null}
          {need ? (
            <div data-testid="idea-builds-on" className="mt-3 rounded-xl border border-line p-3">
              <p className="text-base">This builds on {need.title}. Prove it first.</p>
              <button type="button" onClick={() => setOpened(need)} className="mt-2 min-h-11 rounded-xl border border-line px-4 text-base font-medium text-accent active:bg-line">
                Go to {need.title}
              </button>
            </div>
          ) : null}
          {tiles.length ? <TeachTiles tiles={tiles} onOpen={(id) => setOpened(ideaOf(id))} /> : null}
          <p data-testid="idea-text" className="mt-2 text-lg">
            {ideaText(idea, scheme)}
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
                  <p className="pt-1 text-base text-muted">
                    {isSpellingIdea(idea.id)
                      ? `No word of ${loaded.passage.title} is spelt with this.`
                      : `No word of ${loaded.passage.title} has this idea in its parsing.`}
                  </p>
                )}
              </div>
              {table ? <ParadigmTable table={table} /> : null}
            </>
          )}
        </div>
        <div className="shrink-0 border-t border-line px-4 pt-2 pb-[calc(0.5rem+var(--lp-bar-inset))]">
          <div data-testid="level-slider">
            <input
              type="range"
              aria-label="Your level"
              aria-valuetext={STOPS[shown].label}
              min={0}
              max={STOPS.length - 1}
              step={1}
              value={shown}
              disabled={loaded === null}
              onChange={(e) => (dragging.current ? setDragged(Number(e.target.value)) : slideTo(Number(e.target.value)))}
              onKeyDown={stepBy}
              onPointerDown={() => {
                dragging.current = true;
              }}
              onPointerUp={letGo}
              onPointerCancel={letGo}
              className="level-slider block w-full"
            />
            <div data-testid="level-stops" aria-hidden="true" className="flex justify-between text-sm text-muted">
              {STOPS.map((stop, i) => (
                <span key={stop.label} className={i === shown ? 'font-medium text-accent' : undefined}>
                  {stop.label}
                </span>
              ))}
            </div>
          </div>
          {level?.level === 'solid' ? null : (
            <button type="button" onClick={markKnown} className="mx-auto mt-1 block min-h-11 px-3 text-sm text-muted underline underline-offset-4">
              Mark known without a drill
            </button>
          )}
          <div className="mt-1 flex gap-2">
            <button type="button" disabled={loaded === null} onClick={() => setDrill('practice')} className={`${BUTTON} border-line text-accent active:bg-line disabled:text-muted`}>
              Drill it
            </button>
            {onAsk ? (
              <button type="button" onClick={() => onAsk(idea.terms[0] ?? idea.title)} className={`${BUTTON} border-line text-accent active:bg-line`}>
                Ask the tutor
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {asking ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 px-6">
          <div role="alertdialog" aria-modal="true" aria-labelledby="idea-go-first" className="w-full max-w-sm rounded-2xl border border-line bg-surface p-4">
            <p id="idea-go-first" className="text-lg font-medium">
              Go to {asking.need.title} first?
            </p>
            <p className="mt-1 text-base text-muted">This idea builds on it, and it is not solid yet.</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                ref={focusOnMount}
                onClick={() => {
                  setMoved(null);
                  setAsking(null);
                  setOpened(asking.need);
                }}
                className={`${BUTTON} border-accent bg-accent text-accent-fg`}
              >
                Go there
              </button>
              <button type="button" onClick={() => goOn(asking.to)} className={`${BUTTON} border-line text-accent active:bg-line`}>
                Stay here
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {switching ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 px-6">
          <div role="alertdialog" aria-modal="true" aria-labelledby="idea-switch" className="w-full max-w-sm rounded-2xl border border-line bg-surface p-4">
            <p id="idea-switch" className="text-lg font-medium">
              You are learning {switching.title}. Switch to {idea.title}?
            </p>
            <p className="mt-1 text-base text-muted">You learn one idea at a time. {switching.title} goes back to Not yet, and what you did on it is kept.</p>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                ref={focusOnMount}
                onClick={() => {
                  setSwitching(null);
                  teach('got-it', 'switch');
                }}
                className={`${BUTTON} border-accent bg-accent text-accent-fg`}
              >
                Switch
              </button>
              <button
                type="button"
                onClick={() => {
                  setSwitching(null);
                  setMoved(null);
                }}
                className={`${BUTTON} border-line text-accent active:bg-line`}
              >
                Keep {switching.title}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {drill ? (
        <DrillItScreen
          ideaId={idea.id}
          mode={drill}
          passage={passage?.chapters}
          onResult={(result) => void recordDrill(result, drill).catch((error: unknown) => console.error('could not keep the drill', error))}
          onClose={closeDrill}
        />
      ) : null}
      {opened ? <IdeaSheet idea={opened} onClose={() => setOpened(null)} onWord={onWord} onAsk={onAsk} /> : null}
    </div>
  );
}
