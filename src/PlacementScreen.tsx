// src/PlacementScreen.tsx — Placement (mw-hqd5bz.8, #/placement): an adaptive test of the grammar his goal needs. It walks the ideas in the order of
// the approach he chose, two questions an idea, and goes easier when he misses (src/data/grammar/placement.ts has the rules), down to the
// letters. Every answer goes on the back-off schedule and every finished idea gets its level. It ends on 'Where you are'; after twenty
// questions it pauses and keeps its place (src/data/placementKeep.ts), so he can go on another day.
import { useEffect, useRef, useState } from 'react';
import { approachOf, DEFAULT_APPROACH, levelNumberOf, orderOf, type GrammarApproach } from './approaches';
import { BOOK_INDEX } from './data/bookIndex';
import { loadChapter, type Chapter } from './data/chapter';
import { goalTitle, parseGoal } from './data/goal';
import { ideaOf } from './data/grammar/ladder';
import { passageNeeds, type Level } from './data/grammar/needs';
import {
  answer,
  resumePlacement,
  startPlacement,
  summarize,
  type PlacementState,
} from './data/grammar/placement';
import { writeAnswer } from './data/grammar/placementWrite';
import { questionFor } from './data/grammar/placementQuestion';
import type { GrammarQuestion } from './data/grammar/questions';
import { clearPlacement, readPlacement, savePlacement, type SavedPlacement } from './data/placementKeep';
import { mulberry32, type Random } from './data/quiz';
import { getGoal, getGrammarApproach, listLevels } from './data/repositories';
import { publish } from './events/bus';
import { navigate } from './nav/route';
import { ItemCard } from './review/ItemCard';
import { GRAMMAR, loadPassage, type GrammarItem } from './review/kinds';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { chosenPronunciation } from './speech/greek';
import { focusOnMount } from './ui/focus';

/** What a placement is of: the saved goal text ('' for none), the approach it walks and 'Read 1 John 1:1' for the goal. */
interface Session {
  goal: string;
  approach: GrammarApproach;
  title: string;
}

type Run =
  | { status: 'loading' }
  | { status: 'intro'; kept: SavedPlacement | null }
  | { status: 'starting' }
  | { status: 'asking'; state: PlacementState; item: GrammarItem; picked: string | null; after: PlacementState | null }
  | { status: 'over'; state: PlacementState };

const LEVEL_WORDS: Record<Level, string> = { solid: 'Solid', frontier: 'Frontier', notYet: 'Not yet' };

/** 'The genitive case' -> 'the genitive case'; a title that does not start with The is left as it is. */
const plain = (title: string): string => (title.startsWith('The ') ? `t${title.slice(1)}` : title);

const itemOf = (question: GrammarQuestion): GrammarItem => ({ kind: 'grammar', id: question.ideaId, question, mode: 'choice' });

const BUTTON = 'min-h-12 w-full rounded-xl text-lg font-medium';

export function PlacementScreen({ newRandom = () => Math.random }: { newRandom?: () => Random }) {
  const [run, setRun] = useState<Run>({ status: 'loading' });
  // The answers are written one after the other; the next question waits for the last of them.
  const writing = useRef<Promise<unknown>>(Promise.resolve());
  const passage = useRef<Chapter[]>([]);
  const lastQuestion = useRef<GrammarQuestion | null>(null);
  // the goal text and the approach this placement walks, for the cards that come after the intro
  const [session, setSession] = useState<Session>({ goal: '', approach: approachOf(DEFAULT_APPROACH)!, title: '' });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [goalText, approachId] = await Promise.all([getGoal(), getGrammarApproach()]);
      const approach = approachOf(approachId) ?? approachOf(DEFAULT_APPROACH)!;
      const saved = readPlacement();
      const kept = saved && saved.goal === goalText && saved.approach === approach.id ? saved : null;
      if (cancelled) return;
      setSession({ goal: goalText, approach, title: goalTitleOf(goalText) });
      setRun({ status: 'intro', kept });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const header = (
    <ScreenHeader title="Placement" back={<HeaderButton onClick={() => navigate('settings')}>‹ Settings</HeaderButton>} />
  );

  /** Shows the question the state asks, or the end when it asks none. */
  const ask = async (state: PlacementState): Promise<void> => {
    if (state.done === 'finished') return finish(state);
    if (state.done === 'paused') return setRun({ status: 'over', state });
    if (passage.current.length === 0) passage.current = await loadPassage(mulberry32(state.seed));
    const question = questionFor(state, passage.current, lastQuestion.current, chosenPronunciation().respell);
    lastQuestion.current = question;
    setRun({ status: 'asking', state, item: itemOf(question), picked: null, after: null });
  };

  const finish = (state: PlacementState): void => {
    clearPlacement();
    const { solid, frontier, notYet, untested } = summarize(state);
    publish({ kind: 'placement-done', goal: session.goal, approach: session.approach.id, solid, frontier, notYet, untested });
    setRun({ status: 'over', state });
  };

  const begin = async (kept: SavedPlacement | null, resume: boolean): Promise<void> => {
    setRun({ status: 'starting' });
    if (resume && kept) {
      const state = resumePlacement(kept.state);
      savePlacement({ ...kept, state });
      return ask(state);
    }
    const goal = parseGoal(session.goal, BOOK_INDEX);
    const [needs, levels] = await Promise.all([goal ? passageNeeds(goal, loadChapter, BOOK_INDEX) : null, listLevels()]);
    const known = new Map(Array.from(levels, ([id, row]): [string, Level] => [id, row.level]));
    const seed = Math.floor(newRandom()() * 0x100000000);
    const state = startPlacement(needs, known, orderOf(session.approach), seed);
    savePlacement({ goal: session.goal, approach: session.approach.id, state });
    passage.current = [];
    lastQuestion.current = null;
    return ask(state);
  };

  if (run.status === 'loading' || run.status === 'starting') return <>{header}<main className="screen min-h-0 flex-1" aria-busy="true" /></>;

  if (run.status === 'intro') {
    const { kept } = run;
    return (
      <>
        {header}
        <main className="screen min-h-0 flex-1 px-6 pt-8 text-center">
          <p data-testid="placement-goal" className="text-2xl font-semibold">
            Placement: {session.title}
          </p>
          <p className="mt-2 text-muted">
            Questions on the grammar it needs, in the order of {session.approach.name}. Miss the easy things and it goes easier, down to the letters. Twenty questions at a time.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3">
            {kept ? (
              <>
                <button type="button" onClick={() => void begin(kept, true)} className={`${BUTTON} bg-accent text-accent-fg`}>
                  Go on
                </button>
                <p data-testid="placement-kept" className="text-muted">
                  {kept.state.asked.length} {kept.state.asked.length === 1 ? 'question' : 'questions'} answered so far.
                </p>
                <button type="button" onClick={() => void begin(kept, false)} className={`${BUTTON} border border-line`}>
                  Start over
                </button>
              </>
            ) : (
              <button type="button" onClick={() => void begin(null, false)} className={`${BUTTON} bg-accent text-accent-fg`}>
                Start
              </button>
            )}
            <button type="button" onClick={() => navigate('settings')} className={`${BUTTON} border border-line`}>
              Back to Settings
            </button>
          </div>
        </main>
      </>
    );
  }

  if (run.status === 'over') {
    const sum = summarize(run.state);
    const paused = run.state.done === 'paused';
    return (
      <>
        {header}
        <main className="screen min-h-0 flex-1 px-4 pt-6">
          <h2 data-testid="placement-title" className="text-center text-2xl font-semibold">
            {paused ? `Paused after ${run.state.asked.length} questions` : 'Where you are'}
          </h2>
          <p data-testid="where" className="mt-2 text-center text-lg">
            {paused ? 'So far: ' : 'Where you are: '}solid {sum.solid}, frontier {sum.frontier}, not yet {sum.notYet}; untested {sum.untested}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3">
            {paused ? (
              <button
                type="button"
                onClick={() => {
                  const state = resumePlacement(run.state);
                  savePlacement({ goal: session.goal, approach: session.approach.id, state });
                  void ask(state);
                }}
                className={`${BUTTON} bg-accent text-accent-fg`}
              >
                Go on
              </button>
            ) : null}
            <button type="button" onClick={() => navigate(paused ? 'settings' : 'goal')} className={`${BUTTON} ${paused ? 'border border-line' : 'bg-accent text-accent-fg'}`}>
              {paused ? 'Go on another day' : 'Back to the goal'}
            </button>
          </div>
          <div className="mt-6 space-y-4" data-testid="where-list">
            {sum.tiers.map((t) => (
              <section key={t.tier} aria-label={t.tier}>
                <h3 className="text-base font-medium capitalize">{t.tier}</h3>
                <ul className="mt-1 divide-y divide-line rounded-xl border border-line">
                  {t.ideas.map((i) => (
                    <li key={i.id} data-idea={i.id} data-level={i.level ?? 'untested'} className="flex min-h-12 items-center justify-between gap-3 px-3 py-2 text-base">
                      <span className="min-w-0 break-words">{i.title}</span>
                      <span className={`shrink-0 font-medium ${i.level === 'solid' ? 'text-good' : i.level === 'notYet' ? 'text-bad' : i.level === null ? 'text-muted' : ''}`}>
                        {i.level === null ? 'Untested' : LEVEL_WORDS[i.level]}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <div className="pb-4" />
        </main>
      </>
    );
  }

  const { state, item, picked, after } = run;
  const idea = ideaOf(item.id);
  const levelNo = levelNumberOf(session.approach, idea.id);
  const pick = (option: string) => {
    if (picked !== null) return;
    const right = GRAMMAR.isRight(item, option);
    const next = answer(state, right);
    writing.current = writing.current.then(() => writeAnswer(state, next, right)).catch((error: unknown) => console.error('could not record the answer', error));
    if (next.done === 'finished') clearPlacement();
    else savePlacement({ goal: session.goal, approach: session.approach.id, state: next });
    setRun({ ...run, picked: option, after: next });
    GRAMMAR.hear?.(item);
  };
  const next = async () => {
    if (!after) return;
    await writing.current;
    await ask(after);
  };
  return (
    <>
      {header}
      <main className="screen min-h-0 flex-1 px-4 pt-4">
        <p data-testid="placement-goal" className="text-center text-base text-muted">
          Placement: {session.title}
        </p>
        <p data-testid="placement-question" className="mb-3 text-center text-base font-medium">
          Question {state.asked.length + 1} · {plain(idea.title)} · {session.approach.name}
          {levelNo ? ` L${levelNo}` : ''}
        </p>
        <ItemCard item={item} index={state.asked.length} picked={picked} onPick={pick} />
        {picked !== null ? (
          <div className="mt-2">
            <button type="button" data-testid="next" ref={focusOnMount} onClick={() => void next()} className={`${BUTTON} bg-accent text-accent-fg`}>
              {after && after.done === 'finished' ? 'Finish' : 'Next'}
            </button>
          </div>
        ) : null}
        <div className="pb-4" />
      </main>
    </>
  );
}

/** 'Read 1 John 1:1' for the saved goal text '1 John 1:1'. */
function goalTitleOf(saved: string): string {
  const goal = parseGoal(saved, BOOK_INDEX);
  return goal ? goalTitle(goal, BOOK_INDEX) : 'the whole ladder';
}
