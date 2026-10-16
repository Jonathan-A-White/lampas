// src/ReviewScreen.tsx — Review: what is due today on the back-off schedule. Start asks the due items first (the longest
// overdue first), then other words up to ten, as Quick test questions; every answer moves the item on the schedule; the
// end card gives the score and says how many come back tomorrow and how many later.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { countDue, recordRound, reviewsOf } from './data/repositories';
import { DAY } from './data/schedule';
import { type Random } from './data/quiz';
import { ideaOf } from './data/grammar/ladder';
import { navigate, openParadigm } from './nav/route';
import { ItemCard } from './review/ItemCard';
import { askForMoreItems } from './review/moreItems';
import { KINDS, kindOf, recordParseStep, type ReviewItem } from './review/kinds';
import { makeMove, moveQuestion, moveSaid, pendingMove, type PendingMove } from './review/pickerMove';
import { heldRound, holdRound, releaseRound } from './review/heldRound';
import { hasPractise, takePractise } from './review/practise';
import { drawReviewRound } from './review/round';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { useReportScreen } from './tutor/screenContext';
import type { ScreenFact } from './tutor/screen';
import { focusOnMount } from './ui/focus';
import { NextBar } from './ui/NextBar';

/** What the end card says of New words at (mw-hqd5bz.11): nothing, an offer to move it, or that it was moved. */
type MoveCard = { status: 'none' } | { status: 'offer'; move: PendingMove } | { status: 'said'; move: PendingMove };

type Round =
  | { status: 'start' }
  | { status: 'loading' }
  | { status: 'running'; items: ReviewItem[]; index: number; picked: string | null; right: number; missed: string[] }
  | { status: 'done'; total: number; right: number; tomorrow: number; later: number; move: MoveCard };

/** 'N come back tomorrow, M later', from the schedule rows the round's items now have. */
async function whatComesBack(items: ReviewItem[]): Promise<{ tomorrow: number; later: number }> {
  // a table asked several cells in the round is one row
  const rows = await reviewsOf([...new Map(items.map((i) => [`${i.kind}\0${i.id}`, i])).values()]);
  const cutoff = Date.now() + DAY;
  const tomorrow = rows.filter((r) => r.due <= cutoff).length;
  return { tomorrow, later: rows.length - tomorrow };
}

/** The move the round's grammar answers call for: made at once when Move it is Auto, else offered. None when the round asked no grammar. */
async function moveAfter(items: ReviewItem[]): Promise<MoveCard> {
  if (!items.some((i) => i.kind === 'grammar')) return { status: 'none' };
  const move = await pendingMove();
  if (!move) return { status: 'none' };
  if (move.how === 'ask') return { status: 'offer', move };
  await makeMove(move);
  return { status: 'said', move };
}

/** 'Due today' counts, a kind with none left out: '2 ideas, 3 words'; '0 words' when nothing is due. */
function dueText(counts: number[]): string {
  const parts = KINDS.flatMap((k, i) => (counts[i] > 0 ? [k.count(counts[i])] : []));
  return parts.length > 0 ? parts.join(', ') : (KINDS.find((k) => k.kind === 'word') ?? KINDS[0]).count(0);
}

/** The end card's line about New words at: the offer with Yes · Not now, or what was done. */
function MoveNote({ card, onChange }: { card: MoveCard; onChange: (card: MoveCard) => void }) {
  if (card.status === 'none') return null;
  if (card.status === 'said') {
    return (
      <p data-testid="move-said" className="mt-4 text-lg">
        {moveSaid(card.move.to)}
      </p>
    );
  }
  const yes = async () => {
    await makeMove(card.move);
    onChange({ status: 'said', move: card.move });
  };
  return (
    <div data-testid="move-offer" className="mt-4 rounded-xl border border-line p-4">
      <p className="text-lg font-medium">{moveQuestion(card.move.to)}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button type="button" onClick={() => void yes()} className="min-h-12 rounded-xl bg-accent text-lg font-medium text-accent-fg">
          Yes
        </button>
        <button type="button" onClick={() => onChange({ status: 'none' })} className="min-h-12 rounded-xl border border-line text-lg font-medium">
          Not now
        </button>
      </div>
    </div>
  );
}

/** What the Ask the tutor control tells the tutor about Review: the due line, or the item in hand (its answer only once he has answered), or the score. */
function reviewFacts(round: Round, dueLine: string | undefined): ScreenFact[] {
  if (round.status === 'start') return [{ label: 'Due today', value: dueLine ?? '' }];
  if (round.status === 'done') return [{ label: 'Round', value: `Finished: ${round.right} of ${round.total} right` }];
  if (round.status === 'loading') return [];
  const item = round.items[round.index];
  const kind = item.kind === 'word' ? 'a word' : item.kind === 'sound' ? 'a sound or word he drilled' : item.kind === 'drill-plan' ? 'a step of his drill plan' : item.kind === 'paradigm' ? 'a cell of a table' : 'a grammar idea';
  const question =
    item.kind === 'word'
      ? item.question.prompt
      : item.kind === 'drill-plan'
        ? item.item.kind === 'prove'
          ? `Prove it: a full Drill it of ${ideaOf(item.ideaId).title}`
          : `A short drill on ${item.item.facet?.label ?? ''} in ${ideaOf(item.ideaId).title}`
        : item.kind === 'sound' && !item.question
          ? `Say the word ${item.word ?? ''}`
          : [item.question?.prompt, item.question?.form].filter(Boolean).join(' ');
  const facts: ScreenFact[] = [
    { label: 'Question', value: `${round.index + 1} of ${round.items.length}, ${kind}` },
    { label: 'In hand', value: question },
  ];
  if (round.picked !== null) {
    facts.push({ label: 'He chose', value: round.picked });
    if (item.kind !== 'drill-plan') facts.push({ label: 'Right answer', value: item.kind === 'word' ? item.question.gloss : (item.question?.right ?? '') });
  }
  return facts;
}

export function ReviewScreen({ newRandom = () => Math.random }: { newRandom?: () => Random }) {
  // Items chosen to practise (rusty ones moved back to Frontier, Welcome back's) open their round at once; the rest of Review waits for Start
  // A round he left to see a table (GrammarCard's 'See the table') is taken up again where he stood on Back (mw-svw421.5)
  const [round, setRound] = useState<Round>(() => heldRound() ?? (hasPractise() ? { status: 'loading' } : { status: 'start' }));
  useEffect(() => releaseRound(), []);
  // The answers are written one after the other; the end card waits for the last of them.
  const writing = useRef<Promise<unknown>>(Promise.resolve());
  const due = useLiveQuery(() => Promise.all(KINDS.map((k) => countDue(Date.now(), k.kind))), []);
  const stillDue = due?.reduce((a, b) => a + b, 0);
  useReportScreen({ name: 'Review', facts: reviewFacts(round, due ? dueText(due) : undefined) });

  const draw = () =>
    void drawReviewRound(newRandom(), Date.now(), undefined, takePractise()).then(({ items }) =>
      setRound(items.length > 0 ? { status: 'running', items, index: 0, picked: null, right: 0, missed: [] } : { status: 'start' }),
    );
  const start = () => {
    setRound({ status: 'loading' });
    draw();
  };

  // The round of chosen items is drawn once the screen is up (StrictMode runs the effect twice: the ref lets the first one draw)
  const drawn = useRef(false);
  useEffect(() => {
    if (round.status !== 'loading' || drawn.current) return;
    drawn.current = true;
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const header = (subtitle?: string) => (
    <ScreenHeader title="Review" subtitle={subtitle} back={<HeaderButton onClick={() => navigate('home')}>‹ Reader</HeaderButton>} />
  );

  if (round.status === 'loading') return <>{header()}<main className="screen min-h-0 flex-1" aria-busy="true" /></>;

  if (round.status === 'start') {
    return (
      <>
        {header()}
        <main className="screen min-h-0 flex-1 px-6 pt-8 text-center">
          <p data-testid="due-today" className="text-2xl font-semibold">
            Due today: {due ? dueText(due) : '…'}
          </p>
          <p className="mt-2 text-muted">
            {stillDue === 0 ? 'Nothing is due. Start still asks ten of your words.' : 'The due ones come first, then other words, up to ten.'}
          </p>
          <button type="button" onClick={start} className="mt-6 min-h-12 w-full rounded-xl bg-accent text-lg font-medium text-accent-fg">
            Start
          </button>
          <button type="button" onClick={() => navigate('home')} className="mt-3 min-h-12 w-full rounded-xl border border-line text-lg font-medium">
            Back to reading
          </button>
        </main>
      </>
    );
  }

  if (round.status === 'done') {
    return (
      <>
        {header()}
        <main className="screen min-h-0 flex-1 px-6 pt-8 text-center">
          <p data-testid="score-label" className="text-lg text-muted">
            Score
          </p>
          <p data-testid="score" className="text-4xl font-semibold">
            {round.right} of {round.total}
          </p>
          <p data-testid="comes-back" className="mt-4 text-lg">
            {round.tomorrow} {round.tomorrow === 1 ? 'comes' : 'come'} back tomorrow, {round.later} later
          </p>
          <MoveNote card={round.move} onChange={(move) => setRound({ ...round, move })} />
          {stillDue ? <p className="mt-2 text-muted">{stillDue} more {stillDue === 1 ? 'is' : 'are'} still due.</p> : null}
          <div className="mt-6 grid grid-cols-1 gap-3">
            {stillDue ? (
              <button type="button" onClick={start} className="min-h-12 rounded-xl bg-accent text-lg font-medium text-accent-fg">
                Another round
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => navigate('home')}
              className={`min-h-12 rounded-xl text-lg font-medium ${stillDue ? 'border border-line' : 'bg-accent text-accent-fg'}`}
            >
              Back to reading
            </button>
          </div>
        </main>
      </>
    );
  }

  const { items, index, picked, right } = round;
  const item = items[index];
  const last = index === items.length - 1;
  const pick = (option: string) => {
    if (picked !== null) return;
    const kind = kindOf(item.kind);
    const wasRight = kind.isRight(item, option);
    writing.current = writing.current.then(() => kind.record(item, wasRight)).catch((error: unknown) => console.error('could not record the answer', error));
    // a miss on a grammar idea is remembered: when the round ends the mill is asked, in the background, for more on the weakest of them
    setRound({ ...round, picked: option, right: right + (wasRight ? 1 : 0), missed: !wasRight && item.kind === 'grammar' ? [...round.missed, item.id] : round.missed });
    kind.hear?.(item);
  };
  const next = async () => {
    if (!last) return setRound({ ...round, index: index + 1, picked: null });
    await writing.current;
    const back = await whatComesBack(items);
    // the round's score is what the pace dial reads (src/data/pace.ts)
    await recordRound(right, items.length);
    // not waited for: the end card does not depend on the mill, and the next round starts from what is kept
    void askForMoreItems(round.missed);
    setRound({ status: 'done', total: items.length, right, ...back, move: await moveAfter(items) });
  };
  return (
    <>
      {header(`${index + 1} of ${items.length}`)}
      {/* sideways the round Ask button (56 px, right-3) sits over the options' right edge: the options leave it its room (mw-hqd5bz.35) */}
      <main className="screen min-h-0 flex-1 px-4 pt-6 short:pr-20">
        <ItemCard
          item={item}
          index={index}
          picked={picked}
          onPick={pick}
          onStep={(step, wasRight) => {
            writing.current = writing.current.then(() => recordParseStep(item, step, wasRight)).catch((error: unknown) => console.error('could not record the step', error));
          }}
          onSeeTable={(table) => {
            holdRound(round);
            openParadigm({ table });
          }}
        />
        {picked !== null ? (
          <NextBar>
            <button
              type="button"
              data-testid="next"
              ref={focusOnMount}
              onClick={() => void next()}
              className="min-h-12 w-full rounded-xl bg-accent text-lg font-medium text-accent-fg"
            >
              {last ? 'Finish' : 'Next'}
            </button>
          </NextBar>
        ) : null}
        <div className="pb-4" />
      </main>
    </>
  );
}
