// src/GoalScreen.tsx — the Goal screen (mw-hqd5bz.10, #/goal): where he stands on 'Read 1 John 1:1' and the two buttons that move it, "frontier to solid"
// (Learn next, a lesson to take) and "the next low hanging fruit to frontier" (Next words, three words to add). Two bars, words and grammar ideas, each cut
// into solid, frontier and not yet with the counts written in them; a tap on a bar opens the list behind it. Place me opens the placement, Read it the Reader
// on the goal. The numbers are progressToward's (src/data/grammar/needs.ts), worked out in src/useGoalProgress.ts.
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { approachOf, DEFAULT_APPROACH } from './approaches';
import type { Chapter, GreekWord } from './data/chapter';
import { goalTitle } from './data/goal';
import { BOOK_INDEX } from './data/bookIndex';
import { addLemmaToLearn } from './data/answerWord';
import { groupIdeas, groupWords, learnNext, LEVELS, nextWords, placedAt } from './data/grammar/goalProgress';
import { ideaOf } from './data/grammar/ladder';
import type { Counts, Level } from './data/grammar/needs';
import { addWordToLearn, getGrammarApproach } from './data/repositories';
import { IdeaSheet } from './IdeaSheet';
import { navigate, openReader } from './nav/route';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { useGoalProgress, type GoalProgress } from './useGoalProgress';
import { WordSheet, type Lookup } from './WordSheet';

const BUTTON = 'min-h-12 rounded-xl px-4 text-lg font-medium';
const LEVEL_TITLES: Record<Level, string> = { solid: 'Solid', frontier: 'Frontier', notYet: 'Not yet' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Each segment is told apart by its fill and by the number in it, not by colour alone: solid is filled, frontier is striped, not yet is empty.
const SEGMENT: Record<Level, { className: string; style?: CSSProperties }> = {
  solid: { className: 'bg-accent text-accent-fg' },
  frontier: {
    className: 'border-x border-accent text-fg',
    style: { backgroundImage: 'repeating-linear-gradient(135deg, var(--lp-accent) 0 2px, transparent 2px 8px)', backgroundColor: 'var(--lp-surface)' },
  },
  notYet: { className: 'bg-surface text-muted' },
};

/** A stand-in chapter for addLemmaToLearn, which reads it only when the lexicon cannot be fetched (the needs' own gloss is used then). */
const NO_CHAPTER: Chapter = { book: '', code: '', chapter: 0, lex: {}, parse: {}, verses: [] };

const placedText = (when: number): string => {
  const date = new Date(when);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
};

/** One bar: a button (its aria-label says all three counts) that opens its list, and the same counts written beneath it. */
function Bar({ which, label, counts, open, onToggle }: { which: 'words' | 'ideas'; label: string; counts: Counts; open: boolean; onToggle: () => void }) {
  return (
    <div className="mt-3">
      <h2 className="text-base font-medium">{label}</h2>
      <button
        type="button"
        data-testid={`${which}-bar`}
        aria-expanded={open}
        aria-label={`${label}: ${counts.solid} solid, ${counts.frontier} frontier, ${counts.notYet} not yet of ${counts.total}. ${open ? 'Hide' : 'Show'} the list`}
        onClick={onToggle}
        className="mt-1 flex h-12 w-full overflow-hidden rounded-xl border border-line active:opacity-80"
      >
        {LEVELS.map((level) =>
          counts[level] > 0 ? (
            <span
              key={level}
              data-segment={level}
              aria-hidden="true"
              style={{ flex: `${counts[level]} 1 0`, ...SEGMENT[level].style }}
              className={`flex min-w-9 items-center justify-center text-base font-semibold ${SEGMENT[level].className}`}
            >
              <span className={level === 'frontier' ? 'rounded bg-surface px-1' : undefined}>{counts[level]}</span>
            </span>
          ) : null,
        )}
      </button>
      <p data-testid={`${which}-legend`} className="mt-1 text-base text-muted">
        Solid {counts.solid} · Frontier {counts.frontier} · Not yet {counts.notYet}
      </p>
    </div>
  );
}

function ListGroup({ level, count, children }: { level: Level; count: number; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <section data-level={level} aria-label={LEVEL_TITLES[level]} className="mt-3">
      <h3 className="text-base font-medium">
        {LEVEL_TITLES[level]} ({count})
      </h3>
      <ul className="mt-1 divide-y divide-line rounded-xl border border-line">{children}</ul>
    </section>
  );
}

export function GoalScreen() {
  const progress = useGoalProgress();
  const header = <ScreenHeader title="Goal" back={<HeaderButton onClick={() => navigate('home')}>‹ Reader</HeaderButton>} />;
  if (progress.status === 'loading') return <>{header}<main className="screen min-h-0 flex-1" aria-busy="true" /></>;
  if (progress.status === 'none') {
    return (
      <>
        {header}
        <main className="screen min-h-0 flex-1 px-6 pt-8 text-center">
          <p className="text-2xl font-semibold">No goal yet</p>
          <p className="mt-2 text-muted">Choose a book, a chapter or a verse to work toward, and this screen shows how close you are.</p>
          <button type="button" onClick={() => navigate('settings')} className={`${BUTTON} mt-6 w-full bg-accent text-accent-fg`}>
            Choose a goal
          </button>
        </main>
      </>
    );
  }
  if (progress.status === 'failed') {
    return (
      <>
        {header}
        <main role="alert" className="screen min-h-0 flex-1 px-6 pt-8 text-center">
          <p className="text-lg">Could not count what {goalTitle(progress.goal, BOOK_INDEX)} needs{navigator.onLine === false ? ', and you are offline' : ''}.</p>
          <button type="button" onClick={progress.retry} className={`${BUTTON} mt-4 w-full bg-accent text-accent-fg`}>
            Try again
          </button>
        </main>
      </>
    );
  }
  return <>{header}<GoalBody progress={progress} /></>;
}

function GoalBody({ progress }: { progress: Extract<GoalProgress, { status: 'ready' }> }) {
  const { goal, needs, states, levels, rows } = progress;
  const [open, setOpen] = useState<'words' | 'ideas' | null>(null);
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const [word, setWord] = useState<Lookup | null>(null);
  const [wordChapter, setWordChapter] = useState<Chapter | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const approachId = useLiveQuery(getGrammarApproach, []);
  const approach = approachOf(approachId ?? DEFAULT_APPROACH) ?? approachOf(DEFAULT_APPROACH)!;
  const next = learnNext(needs, approach, levels);
  const words = nextWords(needs, states);
  const placed = placedAt(rows);
  const title = goalTitle(goal, BOOK_INDEX);

  const add = async (lemma: string, gloss: string): Promise<void> => {
    const result = await addLemmaToLearn({ title: '', chapter: NO_CHAPTER, verse: null }, lemma);
    if (result.result === 'unknown') await addWordToLearn(lemma, gloss);
    setAdded(lemma);
  };
  const toggle = (which: 'words' | 'ideas') => setOpen(open === which ? null : which);
  const wordGroups = open === 'words' ? groupWords(needs, states) : null;
  const ideaGroups = open === 'ideas' ? groupIdeas(needs, levels) : null;

  return (
    <>
      <main className="screen min-h-0 flex-1 px-4 pt-4">
        <div className="flex items-center gap-3">
          <h2 data-testid="goal-title" className="min-w-0 flex-1 text-2xl font-semibold">
            {title}
          </h2>
          <button type="button" onClick={() => navigate('settings')} className="min-h-12 shrink-0 rounded-xl border border-line px-4 text-base font-medium text-accent">
            Change
          </button>
        </div>

        <Bar which="words" label="Words" counts={progress.progress.words} open={open === 'words'} onToggle={() => toggle('words')} />
        {wordGroups ? (
          <div data-testid="words-list">
            {LEVELS.map((level) => (
              <ListGroup key={level} level={level} count={wordGroups[level].length}>
                {wordGroups[level].map((w) => (
                  <li key={w.lemma} data-lemma={w.lemma} className="flex min-h-12 items-center justify-between gap-3 px-3 py-2">
                    <span lang="grc" className="font-greek text-xl">
                      {w.lemma}
                    </span>
                    <span className="min-w-0 truncate text-base text-muted">{w.gloss}</span>
                  </li>
                ))}
              </ListGroup>
            ))}
          </div>
        ) : null}

        <Bar which="ideas" label="Grammar ideas" counts={progress.progress.grammar} open={open === 'ideas'} onToggle={() => toggle('ideas')} />
        {ideaGroups ? (
          <div data-testid="ideas-list">
            {LEVELS.map((level) => (
              <ListGroup key={level} level={level} count={ideaGroups[level].length}>
                {ideaGroups[level].map((i) => (
                  <li key={i.id} data-idea={i.id}>
                    <button type="button" onClick={() => setIdeaId(i.id)} className="flex min-h-12 w-full items-center px-3 py-2 text-left text-base active:bg-line">
                      {ideaOf(i.id).title}
                    </button>
                  </li>
                ))}
              </ListGroup>
            ))}
          </div>
        ) : null}
        <p className="mt-2 text-base text-muted">Solid when both are full.</p>

        <section className="mt-5">
          {placed !== undefined ? (
            <div className="flex items-center gap-3">
              <p className="min-w-0 flex-1 text-base">Placed on {placedText(placed)}</p>
              <button type="button" onClick={() => navigate('placement')} className="min-h-12 shrink-0 rounded-xl border border-line px-4 text-base font-medium text-accent">
                Place again
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => navigate('placement')} className={`${BUTTON} w-full border border-line text-accent`}>
              Place me
            </button>
          )}
        </section>

        <section className="mt-5">
          {next ? (
            <button
              type="button"
              data-testid="learn-next"
              onClick={() => setIdeaId(next.idea.id)}
              className="flex min-h-12 w-full flex-col items-start rounded-xl bg-accent px-4 py-2 text-left text-accent-fg active:opacity-80"
            >
              <span className="text-lg font-medium">Learn next: {next.idea.title}{next.lesson ? ` · ${next.lesson.lesson.title}` : ''}</span>
            </button>
          ) : (
            <p data-testid="learn-next-none" className="text-base text-muted">
              Every idea this goal needs is on the frontier or solid.
            </p>
          )}
        </section>

        <section className="mt-5">
          <h2 className="text-base font-medium">Next words</h2>
          {words.length ? (
            <ul className="mt-1 space-y-2">
              {words.map((w) => (
                <li key={w.lemma}>
                  <button
                    type="button"
                    data-testid="next-word"
                    data-lemma={w.lemma}
                    aria-label={`Add ${w.lemma} to my words`}
                    onClick={() => void add(w.lemma, w.gloss)}
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-line px-3 py-1 text-left active:bg-line"
                  >
                    <span lang="grc" className="font-greek text-2xl">
                      {w.lemma}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-base text-muted">{w.gloss}</span>
                    <span aria-hidden="true" className="shrink-0 text-base font-medium text-accent">
                      Add
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-base text-muted">Every word this goal needs is on your list.</p>
          )}
          {added ? (
            <p role="status" className="mt-1 text-base text-muted">
              Added {added} to your words.
            </p>
          ) : null}
        </section>

        <section className="mt-5 pb-4">
          <button
            type="button"
            onClick={() => openReader({ book: goal.book, chapter: goal.chapter ?? 1, verse: goal.verse })}
            className={`${BUTTON} w-full bg-accent text-accent-fg`}
          >
            Read it
          </button>
        </section>
        <div className="pb-[var(--lp-end-inset)]" />
      </main>
      {ideaId ? (
        <IdeaSheet
          idea={ideaOf(ideaId)}
          onClose={() => setIdeaId(null)}
          onWord={(chapter: Chapter, tapped: GreekWord) => {
            setIdeaId(null);
            setWordChapter(chapter);
            setWord({ words: [tapped], fromEnglish: false });
          }}
        />
      ) : null}
      {word && wordChapter ? <WordSheet chapter={wordChapter} lookup={word} onClose={() => setWord(null)} /> : null}
    </>
  );
}
