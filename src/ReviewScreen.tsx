// src/ReviewScreen.tsx — Review: what is due today on the back-off schedule. Start asks the due items first (the longest
// overdue first), then other words up to ten, as Quick test questions; every answer moves the item on the schedule; the
// end card gives the score and says how many come back tomorrow and how many later.
import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { countDue, reviewsOf } from './data/repositories';
import { DAY } from './data/schedule';
import { type Random } from './data/quiz';
import { navigate } from './nav/route';
import { ItemCard } from './review/ItemCard';
import { KINDS, kindOf, type ReviewItem } from './review/kinds';
import { drawReviewRound } from './review/round';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { focusOnMount } from './ui/focus';

type Round =
  | { status: 'start' }
  | { status: 'loading' }
  | { status: 'running'; items: ReviewItem[]; index: number; picked: string | null; right: number }
  | { status: 'done'; total: number; right: number; tomorrow: number; later: number };

/** 'N come back tomorrow, M later', from the schedule rows the round's items now have. */
async function whatComesBack(items: ReviewItem[]): Promise<{ tomorrow: number; later: number }> {
  const rows = await reviewsOf(items);
  const cutoff = Date.now() + DAY;
  const tomorrow = rows.filter((r) => r.due <= cutoff).length;
  return { tomorrow, later: rows.length - tomorrow };
}

/** 'Due today' counts, a kind with none left out: '2 ideas, 3 words'; '0 words' when nothing is due. */
function dueText(counts: number[]): string {
  const parts = KINDS.flatMap((k, i) => (counts[i] > 0 ? [k.count(counts[i])] : []));
  return parts.length > 0 ? parts.join(', ') : (KINDS.find((k) => k.kind === 'word') ?? KINDS[0]).count(0);
}

export function ReviewScreen({ newRandom = () => Math.random }: { newRandom?: () => Random }) {
  const [round, setRound] = useState<Round>({ status: 'start' });
  // The answers are written one after the other; the end card waits for the last of them.
  const writing = useRef<Promise<unknown>>(Promise.resolve());
  const due = useLiveQuery(() => Promise.all(KINDS.map((k) => countDue(Date.now(), k.kind))), []);
  const stillDue = due?.reduce((a, b) => a + b, 0);

  const start = () => {
    setRound({ status: 'loading' });
    void drawReviewRound(newRandom()).then(({ items }) =>
      setRound(items.length > 0 ? { status: 'running', items, index: 0, picked: null, right: 0 } : { status: 'start' }),
    );
  };

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
          <p data-testid="score" className="text-4xl font-semibold">
            {round.right} of {round.total}
          </p>
          <p data-testid="comes-back" className="mt-4 text-lg">
            {round.tomorrow} {round.tomorrow === 1 ? 'comes' : 'come'} back tomorrow, {round.later} later
          </p>
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
    setRound({ ...round, picked: option, right: right + (wasRight ? 1 : 0) });
    kind.hear?.(item);
  };
  const next = async () => {
    if (!last) return setRound({ ...round, index: index + 1, picked: null });
    await writing.current;
    setRound({ status: 'done', total: items.length, right, ...(await whatComesBack(items)) });
  };
  return (
    <>
      {header(`${index + 1} of ${items.length}`)}
      <main className="screen min-h-0 flex-1 px-4 pt-6">
        <ItemCard item={item} index={index} picked={picked} onPick={pick} />
        {picked !== null ? (
          <div className="mt-2">
            <button
              type="button"
              data-testid="next"
              ref={focusOnMount}
              onClick={() => void next()}
              className="min-h-12 w-full rounded-xl bg-accent text-lg font-medium text-accent-fg"
            >
              {last ? 'Finish' : 'Next'}
            </button>
          </div>
        ) : null}
        <div className="pb-4" />
      </main>
    </>
  );
}
