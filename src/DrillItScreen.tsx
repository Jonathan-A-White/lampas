// src/DrillItScreen.tsx — Drill it on screen (mw-i7xe0n.3, docs/grammar.md 'Drill it on the idea sheet'): a full screen over the idea sheet that walks one idea with the engine
// (data/grammar/drillIt.ts): the idea's title and 'Step N of M', one question at a time drawn as Review draws it (GrammarCard, multiple choice), a Hint that takes half the
// wrong answers away and marks the answer hinted (a hinted right does not count), and Stop. At the end, the result: 'Proved' or 'You reached step N of M', then 'Strong:' and
// 'Weak:' by facet, and Done. The screen writes nothing: it hands the finished result to onResult (the sheet keeps the run and moves the level, grammarLevels.ts recordDrill).
import { useEffect, useRef, useState } from 'react';
import type { Chapter } from './data/chapter';
import { answer as answerWalk, start, type DrillResult, type DrillWalk } from './data/grammar/drillIt';
import { drillSeed } from './data/grammar/drillSeed';
import { ideaOf, type Facet } from './data/grammar/ladder';
import type { Level } from './data/grammar/needs';
import type { DrillMode } from './data/repositories';
import { GrammarCard } from './GrammarCard';
import { useSheetBack } from './ui/sheetBack';
import { focusOnMount } from './ui/focus';

const GREEK = /[Ͱ-Ͽἀ-῿]/;
const BUTTON = 'min-h-12 w-full rounded-xl border text-lg font-medium';

/** The walk of an idea. The ideas it builds on are taken to be solid (the sheet asked him about them before): a drill tests one idea, never what is under it. */
function begin(ideaId: string, passage: readonly Chapter[] | undefined): DrillWalk | null {
  const assumed = new Map<string, Level>(ideaOf(ideaId).needs.map((id) => [id, 'solid']));
  const walk = start(ideaId, assumed, { passage, seed: drillSeed.next() });
  return 'needs' in walk ? null : walk;
}

/** The wrong answers a Hint takes away: the first half of them, rounded up. An option spelt like the right one is not wrong. */
function hintTakes(options: readonly string[], right: string): Set<number> {
  const wrong = options.flatMap((o, i) => (o === right ? [] : [i]));
  return new Set(wrong.slice(0, Math.ceil(wrong.length / 2)));
}

function Facets({ title, testId, facets }: { title: string; testId: string; facets: readonly Facet[] }) {
  return (
    <section data-testid={testId} className="mt-4">
      <h3 className="text-lg font-bold">{title}</h3>
      {facets.length === 0 ? (
        <p className="text-base text-muted">none</p>
      ) : (
        <ul className="mt-1 space-y-1 text-lg">
          {facets.map((facet) => {
            const greek = GREEK.test(facet.label);
            return (
              <li key={facet.id}>
                <span lang={greek ? 'grc' : undefined} className={greek ? 'font-greek text-[length:var(--lp-greek-size)]' : undefined}>
                  {facet.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Result({ result, mode }: { result: DrillResult; mode: DrillMode }) {
  const headline = result.proved
    ? 'Proved'
    : result.edgeStep === 0
      ? `You have not reached step 1 of ${result.topStep} yet`
      : `You reached step ${result.edgeStep} of ${result.topStep}`;
  const note = result.proved
    ? 'It is solid now: proved by drill.'
    : mode === 'prove'
      ? 'Not proved yet. It stays on Learning; drill it again when you are ready.'
      : 'Not proved this time. Your level has not changed.';
  return (
    <div data-testid="drill-result">
      <h3 className="text-2xl font-bold">{headline}</h3>
      <p className="mt-1 text-base text-muted">{note}</p>
      <Facets title="Strong:" testId="drill-strong" facets={result.strong} />
      <Facets title="Weak:" testId="drill-weak" facets={result.weak} />
    </div>
  );
}

export function DrillItScreen({ ideaId, mode, passage, onResult, onClose }: {
  ideaId: string;
  mode: DrillMode;
  /** the chapters the questions about forms are drawn from; none asks only what the idea says of itself */
  passage?: readonly Chapter[];
  /** the run is over: keep it and move the level (called once) */
  onResult: (result: DrillResult) => void;
  /** Stop, Done or Back: the screen goes */
  onClose: () => void;
}) {
  useSheetBack(onClose);
  const idea = ideaOf(ideaId);
  const [walk, setWalk] = useState<DrillWalk | null>(() => begin(ideaId, passage));
  // the walk after the answer he has given, held until he taps Next so he can read whether he was right
  const [after, setAfter] = useState<{ walk: DrillWalk; picked: string } | null>(null);
  const [taken, setTaken] = useState<ReadonlySet<number> | null>(null);
  const reported = useRef(false);
  const result = walk?.result ?? null;
  useEffect(() => {
    if (result && !reported.current) {
      reported.current = true;
      onResult(result);
    }
  }, [result, onResult]);

  const question = walk?.current ?? null;
  const pick = (option: string) => {
    if (!walk || !question || after) return;
    setAfter({ walk: answerWalk(walk, option === question.right, taken !== null), picked: option });
  };
  const next = () => {
    if (!after) return;
    setWalk(after.walk);
    setAfter(null);
    setTaken(null);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Drill it" className="fixed inset-0 z-40 flex flex-col bg-surface">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-1">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold">{idea.title}</h2>
          {walk && !result ? (
            <p data-testid="drill-step" className="text-sm text-muted">
              Step {walk.step} of {walk.steps.length}
            </p>
          ) : null}
        </div>
        {result ? null : (
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
            Stop
          </button>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3">
        {walk === null ? (
          <p className="text-lg">Drill it could not start on this idea.</p>
        ) : result ? (
          <Result result={result} mode={mode} />
        ) : question ? (
          <GrammarCard
            key={walk.asked.length}
            question={question}
            mode="choice"
            picked={after?.picked ?? null}
            onPick={pick}
            taken={taken ?? undefined}
            sideBySide
          />
        ) : null}
      </div>
      <div className="shrink-0 border-t border-line px-4 pt-2 pb-[calc(0.5rem+var(--lp-bar-inset))]">
        {result || walk === null ? (
          <button type="button" ref={focusOnMount} onClick={onClose} className={`${BUTTON} border-accent bg-accent text-accent-fg`}>
            Done
          </button>
        ) : after ? (
          <button type="button" data-testid="drill-next" ref={focusOnMount} onClick={next} className={`${BUTTON} border-accent bg-accent text-accent-fg`}>
            {after.walk.result ? 'Finish' : 'Next'}
          </button>
        ) : (
          <button
            type="button"
            disabled={taken !== null || question === null}
            onClick={() => question && setTaken(hintTakes(question.options, question.right))}
            className={`${BUTTON} border-line text-accent active:bg-line disabled:text-muted`}
          >
            Hint
          </button>
        )}
      </div>
    </div>
  );
}
