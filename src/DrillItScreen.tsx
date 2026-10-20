// src/DrillItScreen.tsx — Drill it on screen (mw-i7xe0n.3, docs/grammar.md 'Drill it on the idea sheet'): a full screen over the idea sheet that walks one idea with the engine
// (data/grammar/drillIt.ts): the idea's title and 'Step N of M', one question at a time drawn as Review draws it (GrammarCard, multiple choice), a Hint that takes half the
// wrong answers away and marks the answer hinted (a hinted right does not count), and Stop. At the end, the result: 'Proved' or 'You reached step N of M', then 'Strong:' and
// 'Weak:' by facet, and Done, with the round Ask the tutor button at the foot's right end (mw-5r3p30.649): the tutor it opens is told every question of the run, his answer, the
// right answer and whether he was right (src/tutor/drillTalk.ts). The screen writes nothing: it hands the finished result to onResult (the sheet keeps the run and moves the level, grammarLevels.ts recordDrill).
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import type { Chapter } from './data/chapter';
import { answer as answerWalk, start, type DrillResult, type DrillWalk } from './data/grammar/drillIt';
import { planFrom, shortDrill, type PlanItem } from './data/grammar/drillPlan';
import { drillSeed } from './data/grammar/drillSeed';
import { hintTakes } from './data/grammar/hint';
import { ideaOf, type Facet } from './data/grammar/ladder';
import type { Level } from './data/grammar/needs';
import { DialogAskTutor } from './AskTutor';
import { answerPlanItem, getDrillPlan, type DrillMode } from './data/repositories';
import { FacetLabel } from './FacetLabel';
import { GrammarCard } from './GrammarCard';
import { PlanDrillScreen } from './PlanDrillScreen';
import { drillScreen, drillSuggestions, type DrillTry } from './tutor/drillTalk';
import { useSheetBack } from './ui/sheetBack';
import { focusOnMount } from './ui/focus';
import { FootBar } from './ui/NextBar';
import { useSettled } from './ui/settle';

const BUTTON = 'min-h-12 w-full rounded-xl border text-lg font-medium';

/** The walk of an idea. The ideas it builds on are taken to be solid (the sheet asked him about them before): a drill tests one idea, never what is under it. */
function begin(ideaId: string, passage: readonly Chapter[] | undefined): DrillWalk | null {
  const assumed = new Map<string, Level>(ideaOf(ideaId).needs.map((id) => [id, 'solid']));
  const walk = start(ideaId, assumed, { passage, seed: drillSeed.next() });
  return 'needs' in walk ? null : walk;
}

function Facets({ title, testId, facets }: { title: string; testId: string; facets: readonly Facet[] }) {
  return (
    <section data-testid={testId} className="mt-4">
      <h3 className="text-lg font-bold">{title}</h3>
      {facets.length === 0 ? (
        <p className="text-base text-muted">none</p>
      ) : (
        <ul className="mt-1 space-y-1 text-lg">
          {facets.map((facet) => (
            <li key={facet.id}>
              <FacetLabel label={facet.label} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Your drill plan (mw-i7xe0n.4, docs/grammar.md 'Your drill plan'): after a run that did not prove the idea, the plan its weak facets make, as the sheet kept it: a short drill for each,
 * easiest first, then Prove it; 'Start the first drill' opens the first one here and now, and the rest come up in Review. Shown once the kept plan is the one this run made.
 */
function DrillPlan({ result, passage }: { result: DrillResult; passage: readonly Chapter[] | undefined }) {
  const mine = planFrom(result, 0);
  const kept = useLiveQuery(() => getDrillPlan(result.ideaId), [result.ideaId]);
  const [running, setRunning] = useState<PlanItem | null>(null);
  const [questions] = useState(() => (mine?.items[0]?.kind === 'facet' ? shortDrill(result.ideaId, mine.items[0], { passage, seed: drillSeed.next() }) : []));
  if (!mine || !kept || kept.items.map((i) => i.id).join() !== mine.items.map((i) => i.id).join()) return null;
  const first = kept.items[0];
  const untouched = kept.items.every((i) => !i.done);
  return (
    <section data-testid="drill-plan" className="mt-6 rounded-xl border border-line p-4">
      <h3 className="text-lg font-bold">Your drill plan</h3>
      <p className="mt-1 text-base text-muted">A short drill on each weak point, easiest first, then Drill it again to prove it. The rest come up in Review.</p>
      <ol className="mt-3 list-decimal space-y-1 pl-6 text-lg">
        {kept.items.map((item) => (
          <li key={item.id} data-item={item.id} data-done={item.done || undefined}>
            {item.kind === 'prove' ? 'Prove it' : <FacetLabel label={item.facet?.label ?? ''} />}
            {item.done ? ' (done)' : ''}
          </li>
        ))}
      </ol>
      {untouched && questions.length > 0 ? (
        <button type="button" onClick={() => setRunning(first)} className={`${BUTTON} mt-3 border-accent bg-accent text-accent-fg`}>
          Start the first drill
        </button>
      ) : null}
      {running ? (
        <PlanDrillScreen
          ideaId={result.ideaId}
          facetLabel={running.facet?.label ?? ''}
          questions={questions}
          onFinish={(passed) => {
            void answerPlanItem(result.ideaId, kept.at, running.id, passed);
            setRunning(null);
          }}
          onClose={() => setRunning(null)}
        />
      ) : null}
    </section>
  );
}

const headlineOf = (result: DrillResult): string =>
  result.proved ? 'Proved' : result.edgeStep === 0 ? `You have not reached step 1 of ${result.topStep} yet` : `You reached step ${result.edgeStep} of ${result.topStep}`;

function Result({ result, mode, passage }: { result: DrillResult; mode: DrillMode; passage: readonly Chapter[] | undefined }) {
  const headline = headlineOf(result);
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
      <DrillPlan result={result} passage={passage} />
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
  // every question as he answered it, for the tutor on the results (mw-5r3p30.649), and the key this run's talk is kept under
  const [tries, setTries] = useState<DrillTry[]>([]);
  const [talkKey] = useState(() => `screen.drill-it.${Date.now()}`);
  const reported = useRef(false);
  const result = walk?.result ?? null;
  // Hint (and Done, after Finish) stands where Next was: a second tap of a double tap on Next lands on it, so it waits for the new card to settle
  // as the card's options do (src/ui/settle.ts, mw-5r3p30.430)
  const settled = useSettled(walk?.asked.length ?? 0);
  useEffect(() => {
    if (result && !reported.current) {
      reported.current = true;
      onResult(result);
    }
  }, [result, onResult]);

  const talkScreen = result
    ? drillScreen({ idea: idea.title, headline: headlineOf(result), tries, strong: result.strong.map((f) => f.label), weak: result.weak.map((f) => f.label) })
    : null;
  const question = walk?.current ?? null;
  const pick = (option: string) => {
    if (!walk || !question || after) return;
    setAfter({ walk: answerWalk(walk, option === question.right, taken !== null), picked: option });
    setTries((all) => [...all, { question, picked: option, hinted: taken !== null }]);
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
          <h2 className="title-wrap text-lg font-bold">{idea.title}</h2>
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
          <Result result={result} mode={mode} passage={passage} />
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
      <FootBar beside={result !== null}>
        {result || walk === null ? (
          <button type="button" ref={focusOnMount} onClick={() => settled() && onClose()} className={`${BUTTON} border-accent bg-accent text-accent-fg`}>
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
            onClick={() => settled() && question && setTaken(hintTakes(question.options, question.right, question.near))}
            className={`${BUTTON} border-line text-accent active:bg-line disabled:text-muted`}
          >
            {taken !== null ? 'Hint used' : 'Hint'}
          </button>
        )}
      </FootBar>
      {talkScreen ? <DialogAskTutor kept={talkKey} screen={talkScreen} suggestions={drillSuggestions(talkScreen)} /> : null}
    </div>
  );
}
