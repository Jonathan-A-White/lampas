// src/GoalScreen.tsx — the Goal screen (mw-hqd5bz.10, #/goal): where he stands on 'Read 1 John 1:1' and the two buttons that move it, "frontier to solid"
// (Learn next, a lesson to take) and "the next low hanging fruit to frontier" (Next words, three words to add). Two bars, words and grammar ideas, each cut
// into solid, frontier and not yet with the counts written in them; a tap on a bar opens the list behind it. Place me opens the placement, Read it the Reader
// on the goal. The numbers are progressToward's (src/data/grammar/needs.ts), worked out in src/useGoalProgress.ts. Below the main path, the optional
// 'Hard sounds (optional)' (src/hardSounds/HardSoundsSection.tsx) and 'Learn the IPA sounds' (src/ipa/OptionalEntry.tsx).
import { useLiveQuery } from 'dexie-react-hooks';
import { useAlive } from 'pwa-kit/alive';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { approachOf, DEFAULT_APPROACH } from './approaches';
import { NO_CHAPTER, type Chapter, type GreekWord } from './data/chapter';
import { goalTitle } from './data/goal';
import { BOOK_INDEX } from './data/bookIndex';
import { lettersText } from './data/grammar/inference';
import { groupIdeas, groupWords, learnNext, learningNow, LEVELS, levelsOf, nextWords, placedAt } from './data/grammar/goalProgress';
import type { GrammarIdea } from './data/grammar/ladder';
import { ideaOfAny as ideaOf, ladderFor } from './data/grammar/ladders';
import type { Counts, Level } from './data/grammar/needs';
import { addWordToLearn, drillPlanCounts, getGrammarApproach, listLevels, takePronunciationSwitch } from './data/repositories';
import type { PronunciationSwitch } from './data/repositories/settings';
import { IdeaSheet } from './IdeaSheet';
import { HardSoundsSection } from './hardSounds/HardSoundsSection';
import { OptionalEntry } from './ipa/OptionalEntry';
import { useAiAllowed } from './gate/licenceContext';
import { LadderStart } from './ReadingLadder';
import { pronunciationOf } from './speech/pronunciation';
import { backTo, navigate, openPlacement, openReader, openVerseRange } from './nav/route';
import { openSetting, openSettingsSection } from './settings/link';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { SourceSegment } from './ui/SourceSegment';
import { useLanguageInHand } from './useLanguageInHand';
import { useReportScreen } from './tutor/screenContext';
import { useGoalProgress, type GoalProgress } from './useGoalProgress';
import { WordSheet, type Lookup } from './WordSheet';
import { GREEK_LANG } from './script/greekLang';
import { addWord } from './tutor/registry';

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

/** 'Solid 1 · Frontier 2 · Not yet 27', as the bars' legends write it. */
const legendText = (c: Counts): string => `Solid ${c.solid} · Frontier ${c.frontier} · Not yet ${c.notYet}`;

/** What Learn next names: a passage to read ('Read 1 John 1:1-4 · Reading the letters of John'), else the letters he is weak in, else the idea and, when it differs from the idea's own title, its lesson (the ladder's are the same). */
const learnNextText = (next: NonNullable<ReturnType<typeof learnNext>>): string => {
  if (next.passage) {
    const lesson = next.lesson;
    return `Read ${next.passage.label} · ${lesson && lesson.lesson.title !== next.passage.label ? lesson.lesson.title : lesson?.level.title}`;
  }
  if (next.gaps) return lettersText(next.gaps);
  const lesson = next.lesson?.lesson.title;
  return lesson && lesson !== next.idea.title ? `${next.idea.title} · ${lesson}` : next.idea.title;
};

function LearnNextButton({ next, onOpen }: { next: NonNullable<ReturnType<typeof learnNext>>; onOpen: () => void }) {
  return (
    <button
      type="button"
      data-testid="learn-next"
      onClick={onOpen}
      className="flex min-h-12 w-full flex-col items-start rounded-xl bg-accent px-4 py-2 text-left text-accent-fg active:opacity-80"
    >
      <span className="text-lg font-medium">Learn next: {learnNextText(next)}</span>
    </button>
  );
}

/** The one idea he is learning now (mw-i7xe0n.6): he learns one at a time, so the Goal screen names it; a tap opens its sheet. */
function LearningNowButton({ idea, onOpen }: { idea: GrammarIdea; onOpen: () => void }) {
  return (
    <button type="button" data-testid="learning-now" onClick={onOpen} className="flex min-h-12 w-full flex-col items-start rounded-xl border border-accent px-4 py-2 text-left active:bg-line">
      <span className="text-lg font-medium">Learning now: {idea.title}</span>
    </button>
  );
}

/** The one way to the ladder drawn as a graph (src/LadderGraph.tsx, #/path), whether or not a goal is set. */
function WholePathButton() {
  return (
    <button type="button" data-testid="whole-path" onClick={() => navigate('path')} className={`${BUTTON} w-full border border-line text-accent`}>
      See the whole path
    </button>
  );
}

/** With no goal set there are no needs, so Learn next can name only the exact gaps (mw-hqd5bz.31); with none, nothing is drawn. */
function NoGoalBody({ levels }: { levels: ReadonlyMap<string, Level> }) {
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const [word, setWord] = useState<Lookup | null>(null);
  const [wordChapter, setWordChapter] = useState<Chapter | null>(null);
  const approachId = useLiveQuery(getGrammarApproach, []);
  const approach = approachOf(approachId ?? DEFAULT_APPROACH) ?? approachOf(DEFAULT_APPROACH)!;
  const next = learnNext({ ideas: [] }, approach, levels);
  const learning = learningNow(levels);
  useReportScreen({
    name: 'Goal',
    facts: [
      { label: 'Goal', value: 'None set yet' },
      ...(learning ? [{ label: 'Learning now', value: learning.title }] : []),
      ...(next ? [{ label: 'Learn next', value: learnNextText(next) }] : []),
    ],
  });
  return (
    <>
      <main className="screen min-h-0 flex-1 px-6 pt-8 text-center">
        <p className="text-2xl font-semibold">No goal yet</p>
        <p className="mt-2 text-muted">Choose a book, a chapter or a verse to work toward, and this screen shows how close you are.</p>
        <button type="button" onClick={() => openSettingsSection('goal')} className={`${BUTTON} mt-6 w-full bg-accent text-accent-fg`}>
          Choose a goal
        </button>
        {learning || next ? (
          <section className="mt-5 space-y-2 text-left">
            {learning ? <LearningNowButton idea={learning} onOpen={() => setIdeaId(learning.id)} /> : null}
            {next && (!learning || next.gaps) ? <LearnNextButton next={next} onOpen={() => setIdeaId(next.idea.id)} /> : null}
          </section>
        ) : null}
        <section className="mt-5">
          <WholePathButton />
        </section>
        <div className="text-left">
          <DrillPlans onOpen={setIdeaId} />
          <ReadingLadderSection />
        </div>
        <HardSoundsSection />
        <OptionalEntry />
        <div className="pb-[var(--lp-end-inset)]" />
      </main>
      {ideaId ? (
        <IdeaSheet
          idea={ideaOf(ideaId)}
          onClose={() => setIdeaId(null)}
          covered={word !== null}
          onWord={(chapter: Chapter, tapped: GreekWord) => {
            // the word sheet opens over the idea sheet, which stays: Back closes one sheet at a time (mw-5r3p30.378)
            setWordChapter(chapter);
            setWord({ words: [tapped], fromEnglish: false });
          }}
        />
      ) : null}
      {word && wordChapter ? <WordSheet chapter={wordChapter} lookup={word} onClose={() => setWord(null)} /> : null}
    </>
  );
}

/** Your drill plan (mw-i7xe0n.4): each idea with a plan still open, and how many of its steps are to go; a tap opens the idea's sheet. Nothing is drawn when no plan is open. */
function DrillPlans({ onOpen }: { onOpen: (ideaId: string) => void }) {
  const counts = useLiveQuery(drillPlanCounts, []);
  if (!counts || counts.size === 0) return null;
  return (
    <section aria-label="Drill plans" className="mt-5">
      <h2 className="text-base font-medium">Your drill plans</h2>
      <ul className="mt-1 divide-y divide-line rounded-xl border border-line">
        {[...counts].map(([ideaId, toGo]) => (
          <li key={ideaId} data-idea={ideaId}>
            <button type="button" onClick={() => onOpen(ideaId)} className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-left text-base active:bg-line">
              <span className="flex-1 title-wrap">{ideaOf(ideaId).title}</span>
              <span data-testid="drill-plan-line" className="shrink-0 font-medium text-accent">
                Drill plan: {toGo} to go
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The reading ladder (src/ReadingLadder.tsx): one entry per language he reads in, each starting at the easiest verse to say and keeping its own place. */
function ReadingLadderSection() {
  // Each reading goes to the mill (the verse-read grist): not offered without a licence (mw-8m9dyu.5).
  const ai = useAiAllowed();
  if (!ai) return null;
  return (
    <section aria-label="Reading ladder" className="mt-5 space-y-2">
      <h2 className="text-base font-medium">Reading ladder</h2>
      <p className="text-base text-muted">Read verses aloud, easiest to say first. Each language keeps its own place.</p>
      <LadderStart lang="el" how="push" label="Reading ladder: Greek" />
      <LadderStart lang="en" how="push" label="Reading ladder: English" />
    </section>
  );
}

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
        {legendText(counts)}
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

/** The one-time note after he switched the pronunciation (mw-5r3p30.231): the sounds are learned per pronunciation, so they start again here and the old ones are kept. Taking it forgets it, so it shows once. */
function SwitchNote() {
  const [switched, setSwitched] = useState<PronunciationSwitch | null>(null);
  const alive = useAlive();
  useEffect(() => {
    void takePronunciationSwitch().then((found) => {
      if (found && alive()) setSwitched(found);
    });
  }, [alive]);
  if (!switched) return null;
  return (
    <div role="status" data-testid="pronunciation-switch" className="mx-4 mt-3 flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2">
      <p className="min-w-0 flex-1 text-base">
        You switched to {pronunciationOf(switched.to).label}: the sounds start again here. Your {pronunciationOf(switched.from).label} progress is kept.
      </p>
      <button type="button" onClick={() => setSwitched(null)} className="min-h-12 shrink-0 rounded-xl border border-line px-4 text-base font-medium text-accent">
        Got it
      </button>
    </div>
  );
}

/** The Hebrew ladder's Goal (mw-gdcyf98.10, PROVISIONAL): there is no Hebrew passage to count yet (a Hebrew word carries no parsing until stories g and h), so the screen is the ladder
 * itself: how many of its ideas are solid, on the frontier and not yet, each idea a card that opens its sheet (taught there, or marked known), Learning now, Learn next and Place me. */
function HebrewGoalBody() {
  const ladder = ladderFor('hbo');
  const levels = useLiveQuery(async () => levelsOf(await listLevels()), []);
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const approachId = useLiveQuery(getGrammarApproach, []);
  const approach = approachOf(approachId ?? DEFAULT_APPROACH) ?? approachOf(DEFAULT_APPROACH)!;
  const known = levels ?? new Map<string, Level>();
  const needs = { ideas: ladder.ideas.map((i) => ({ id: i.id, count: 0, example: { form: '', code: '', ref: '' } })) };
  const next = learnNext(needs, approach, known, undefined, 'hbo');
  const learning = learningNow(known, 'hbo');
  const counts: Counts = {
    solid: ladder.ideas.filter((i) => known.get(i.id) === 'solid').length,
    frontier: ladder.ideas.filter((i) => known.get(i.id) === 'frontier').length,
    notYet: ladder.ideas.filter((i) => (known.get(i.id) ?? 'notYet') === 'notYet').length,
    total: ladder.ideas.length,
  };
  useReportScreen({
    name: 'Goal',
    facts: [
      { label: 'Goal', value: 'Read the Old Testament in Hebrew' },
      { label: 'Grammar ideas', value: legendText(counts) },
      { label: 'Learning now', value: learning ? learning.title : 'Nothing yet' },
      { label: 'Learn next', value: next ? learnNextText(next) : 'Every Hebrew idea is on the frontier or solid.' },
    ],
  });
  if (!levels) return <main className="screen min-h-0 flex-1" aria-busy="true" />;
  return (
    <>
      <main className="screen min-h-0 flex-1 px-4 pt-4">
        <h2 data-testid="goal-title" lang="en" className="title-wrap text-2xl font-semibold">
          Read the Old Testament in Hebrew
        </h2>
        <Bar which="ideas" label="Hebrew grammar ideas" counts={counts} open={false} onToggle={() => {}} />
        <section aria-label="Hebrew ideas" data-testid="hebrew-ideas" className="mt-3">
          <ul className="divide-y divide-line rounded-xl border border-line">
            {ladder.ideas.map((idea) => (
              <li key={idea.id} data-idea={idea.id} data-level={known.get(idea.id) ?? 'notYet'}>
                <button type="button" onClick={() => setIdeaId(idea.id)} className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-left text-base active:bg-line">
                  <span className="flex-1 title-wrap">{idea.title}</span>
                  <span className="shrink-0 text-muted">{LEVEL_TITLES[known.get(idea.id) ?? 'notYet']}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="mt-5">
          <button type="button" onClick={() => openPlacement('goal')} className={`${BUTTON} w-full border border-line text-accent`}>
            Place me
          </button>
        </section>
        <section className="mt-5 space-y-2">
          {learning ? <LearningNowButton idea={learning} onOpen={() => setIdeaId(learning.id)} /> : null}
          {next && !learning ? <LearnNextButton next={next} onOpen={() => setIdeaId(next.idea.id)} /> : null}
          {!next && !learning ? (
            <p data-testid="learn-next-none" className="text-base text-muted">
              Every Hebrew idea is on the frontier or solid.
            </p>
          ) : null}
        </section>
        <div className="pb-[var(--lp-end-inset)]" />
      </main>
      {ideaId ? <IdeaSheet idea={ideaOf(ideaId)} onClose={() => setIdeaId(null)} onWord={() => {}} /> : null}
    </>
  );
}

/** At English only no ladder is in hand: the screen says so and points at the row that chooses a language. It is not reachable from Settings or the Reader then; this is for an address typed or kept. */
function NoLanguageBody() {
  return (
    <main className="screen min-h-0 flex-1 px-6 pt-8 text-center">
      <p className="text-2xl font-semibold">No language chosen</p>
      <p className="mt-2 text-muted">The Goal is for Greek or Hebrew. Choose one, and this screen shows how close you are.</p>
      <button type="button" onClick={() => openSetting('languages')} className={`${BUTTON} mt-6 w-full bg-accent text-accent-fg`}>
        Choose a language
      </button>
      <div className="pb-[var(--lp-end-inset)]" />
    </main>
  );
}

export function GoalScreen() {
  const { lang, both } = useLanguageInHand();
  const progress = useGoalProgress();
  const header = (
    <>
      <ScreenHeader title="Goal" back={<HeaderButton onClick={() => backTo('home')}>‹ Reader</HeaderButton>} />
      {both ? <SourceSegment label="Goal language" /> : null}
      <SwitchNote />
    </>
  );
  if (lang === undefined) return <>{header}<main className="screen min-h-0 flex-1" aria-busy="true" /></>;
  if (lang === null) return <>{header}<NoLanguageBody /></>;
  if (lang === 'hbo') return <>{header}<HebrewGoalBody /></>;
  if (progress.status === 'loading') return <>{header}<main className="screen min-h-0 flex-1" aria-busy="true" /></>;
  if (progress.status === 'none') return <>{header}<NoGoalBody levels={progress.levels} /></>;
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
  const next = learnNext(needs, approach, levels, { goal, states: progress.passages });
  const learning = learningNow(levels);
  const words = nextWords(needs, states);
  const placed = placedAt(rows);
  const title = goalTitle(goal, BOOK_INDEX);
  // what the round Ask the tutor control hands the tutor (src/tutor/screen.ts): the screen's own numbers and words, as it writes them
  useReportScreen({
    name: 'Goal',
    facts: [
      { label: 'Goal', value: title },
      { label: 'Words', value: legendText(progress.progress.words) },
      { label: 'Grammar ideas', value: legendText(progress.progress.grammar) },
      { label: 'Placed', value: placed !== undefined ? `On ${placedText(placed)}` : 'Not yet' },
      { label: 'Learning now', value: learning ? learning.title : 'Nothing yet' },
      { label: 'Learn next', value: next ? learnNextText(next) : 'Every idea this goal needs is on the frontier or solid.' },
      { label: 'Next words', value: words.length ? words.map((w) => `${w.lemma} (${w.gloss})`).join(', ') : 'Every word this goal needs is on your list.' },
    ],
  });

  const alive = useAlive();
  const add = async (lemma: string, gloss: string): Promise<void> => {
    const result = await addWord({ title: '', chapter: NO_CHAPTER, verse: null }, lemma);
    if (result.result === 'unknown') await addWordToLearn(lemma, gloss);
    if (alive()) setAdded(lemma);
  };
  const toggle = (which: 'words' | 'ideas') => setOpen(open === which ? null : which);
  const wordGroups = open === 'words' ? groupWords(needs, states) : null;
  const ideaGroups = open === 'ideas' ? groupIdeas(needs, levels) : null;

  return (
    <>
      <main className="screen min-h-0 flex-1 px-4 pt-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 data-testid="goal-title" className="flex-1 basis-48 title-wrap text-2xl font-semibold">
            {title}
          </h2>
          <button type="button" onClick={() => openSettingsSection('goal')} className="min-h-12 shrink-0 rounded-xl border border-line px-4 text-base font-medium text-accent">
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
                    <span {...GREEK_LANG} className="font-greek text-xl">
                      {w.lemma}
                    </span>
                    <span className="title-wrap text-base text-muted">{w.gloss}</span>
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
              <button type="button" onClick={() => openPlacement('goal')} className="min-h-12 shrink-0 rounded-xl border border-line px-4 text-base font-medium text-accent">
                Place again
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => openPlacement('goal')} className={`${BUTTON} w-full border border-line text-accent`}>
              Place me
            </button>
          )}
        </section>

        <section className="mt-5 space-y-2">
          {learning ? <LearningNowButton idea={learning} onOpen={() => setIdeaId(learning.id)} /> : null}
          {next && (!learning || next.gaps || next.passage) ? (
            <LearnNextButton next={next} onOpen={() => (next.passage ? openVerseRange(next.passage.passage) : setIdeaId(next.idea.id))} />
          ) : !learning ? (
            <p data-testid="learn-next-none" className="text-base text-muted">
              Every idea this goal needs is on the frontier or solid.
            </p>
          ) : null}
        </section>

        <section className="mt-5">
          <WholePathButton />
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
                    className="flex min-h-12 w-full flex-wrap items-center gap-x-3 rounded-xl border border-line px-3 py-1 text-left active:bg-line"
                  >
                    <span {...GREEK_LANG} className="font-greek text-2xl">
                      {w.lemma}
                    </span>
                    <span className="flex-1 basis-32 title-wrap text-base text-muted">{w.gloss}</span>
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

        <DrillPlans onOpen={setIdeaId} />

        <ReadingLadderSection />

        <section className="mt-5 pb-4">
          <button
            type="button"
            onClick={() => openReader({ book: goal.book, chapter: goal.chapter ?? 1, verse: goal.verse })}
            className={`${BUTTON} w-full bg-accent text-accent-fg`}
          >
            Read it
          </button>
        </section>
        <HardSoundsSection />
        <OptionalEntry />
        <div className="pb-[var(--lp-end-inset)]" />
      </main>
      {ideaId ? (
        <IdeaSheet
          idea={ideaOf(ideaId)}
          onClose={() => setIdeaId(null)}
          covered={word !== null}
          onWord={(chapter: Chapter, tapped: GreekWord) => {
            // the word sheet opens over the idea sheet, which stays: Back closes one sheet at a time (mw-5r3p30.378)
            setWordChapter(chapter);
            setWord({ words: [tapped], fromEnglish: false });
          }}
        />
      ) : null}
      {word && wordChapter ? <WordSheet chapter={wordChapter} lookup={word} onClose={() => setWord(null)} /> : null}
    </>
  );
}
