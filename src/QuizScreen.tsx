// src/QuizScreen.tsx — the Quick test: ten questions on his solid and learning words. Tap one of four
// glosses, see at once whether it was right, go on; the end screen gives the score and the misses.
import { useEffect, useState } from 'react';
import { loadChapter, type Chapter } from './data/chapter';
import { listWords, recordAnswer, seedWordsIfFirstOpen } from './data/repositories';
import { clearRound, readRound, saveRound } from './data/roundKeep';
import { askAbout, buildQuestion, drawWords, seedDistractors, type Question, type Random } from './data/quiz';
import { navigate } from './nav/route';
import { askInReader } from './nav/readerRequest';
import { speakWord } from './speech/greek';
import { READER_CHAPTER } from './data/readerChapter';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { WordQuestion } from './WordQuestion';
import { focusOnMount } from './ui/focus';

type Round = { status: 'loading' } | { status: 'offer' } | { status: 'ready'; questions: Question[] };

/** The chapter the inflected forms come from. A phone that cannot load it is asked the plain lemmas. */
const loadForms = (): Promise<Chapter | null> => loadChapter('rom', 8).catch(() => null);

async function drawRound(random: Random): Promise<Question[]> {
  // A first open seeds the words; wait for it so a round opened straight away has words to ask.
  await seedWordsIfFirstOpen();
  const [words, chapter] = await Promise.all([listWords(), loadForms()]);
  const pool = seedDistractors();
  return drawWords(words, random).map((w) => buildQuestion(w, pool, chapter, random));
}

/** The way into the Parsing drill from the Test screen. */
function DrillLink() {
  return (
    <button
      type="button"
      onClick={() => navigate('drill')}
      className="mt-3 min-h-12 w-full rounded-xl border border-line text-base font-medium"
    >
      Parsing drill: {READER_CHAPTER.title}
    </button>
  );
}

export function QuizScreen({ newRandom = () => Math.random }: { newRandom?: () => Random }) {
  // A round left half done (the app was closed, or he went back to the reader) is offered again: Resume | New round.
  const [round, setRound] = useState<Round>(() => (readRound() ? { status: 'offer' } : { status: 'loading' }));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [missed, setMissed] = useState<Question[]>([]);

  const another = () => {
    clearRound();
    setRound({ status: 'loading' });
    setIndex(0);
    setPicked(null);
    setMissed([]);
    void drawRound(newRandom()).then((questions) => setRound({ status: 'ready', questions }));
  };

  const resume = () => {
    const saved = readRound();
    if (!saved) return another();
    setIndex(saved.index);
    setPicked(saved.picked);
    setMissed(saved.missed);
    setRound({ status: 'ready', questions: saved.questions });
  };

  useEffect(() => {
    if (round.status === 'offer') return;
    let current = true;
    void drawRound(newRandom()).then((questions) => current && setRound({ status: 'ready', questions }));
    return () => {
      current = false;
    };
    // A round is drawn once, when the screen opens; Another round draws the next.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const questions = round.status === 'ready' ? round.questions : [];
  const total = questions.length;
  const finished = round.status === 'ready' && index >= total && total > 0;
  const question = questions[index];

  const pick = (option: string) => {
    if (!question || picked !== null) return;
    const right = option === question.gloss;
    const nextMissed = right ? missed : [...missed, question];
    setPicked(option);
    setMissed(nextMissed);
    saveRound({ questions, index, picked: option, missed: nextMissed });
    void recordAnswer(question.lemma, right);
    // The word says itself once, by the long press's engine; the Hold to hear bar says it again. No help line here: that bar carries it.
    speakWord(question.prompt, 'greek');
  };

  const askTutor = () => {
    if (!question) return;
    const about = askAbout(question, { chapter: READER_CHAPTER.chapter, verse: 1 });
    askInReader(about.chapter, about.verse, about.text);
  };

  const subtitle = question ? `${index + 1} of ${total}` : null;
  const header = (
    <ScreenHeader
      title="Quick test"
      subtitle={subtitle}
      back={<HeaderButton onClick={() => navigate('home')}>‹ Reader</HeaderButton>}
    />
  );

  if (round.status === 'offer') {
    return (
      <>
        {header}
        <main className="screen min-h-0 flex-1 px-6 pt-8 text-center">
          <p className="text-lg">Round left unfinished</p>
          <p className="mt-1 text-muted">Go on where you stopped, or start a new round.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={resume} className="min-h-12 rounded-xl bg-accent text-lg font-medium text-accent-fg">
              Resume
            </button>
            <button type="button" onClick={another} className="min-h-12 rounded-xl border border-line text-lg font-medium">
              New round
            </button>
          </div>
          <DrillLink />
        </main>
      </>
    );
  }

  if (round.status === 'loading') return <>{header}<main className="screen min-h-0 flex-1" aria-busy="true" /></>;

  if (total === 0) {
    return (
      <>
        {header}
        <main className="screen min-h-0 flex-1 px-6 pt-8 text-center">
          <p className="text-lg">No words to test yet.</p>
          <p className="mt-1 text-muted">Words that are solid or learning are asked here. Add some with Import.</p>
          <DrillLink />
        </main>
      </>
    );
  }

  if (finished) {
    const score = total - missed.length;
    return (
      <>
        {header}
        <main className="screen min-h-0 flex-1 px-4 pt-6">
          <p data-testid="score" className="text-center text-4xl font-semibold">
            {score} of {total}
          </p>
          {missed.length > 0 ? (
            <section aria-labelledby="missed-title" className="mt-6">
              <h2 id="missed-title" className="px-1 pb-1 text-sm font-semibold uppercase tracking-wide text-muted">
                Missed
              </h2>
              <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
                {missed.map((q) => (
                  <li key={q.lemma} data-missed={q.lemma} className="px-3 py-2">
                    <span lang="grc" className="block break-words font-greek text-2xl">{q.lemma}</span>
                    <span className="block break-words text-sm text-muted">{q.gloss}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="mt-6 text-center text-lg">All right. Well done.</p>
          )}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => navigate('home')} className="min-h-12 rounded-xl border border-line text-lg font-medium">
              Done
            </button>
            <button type="button" onClick={another} className="min-h-12 rounded-xl bg-accent text-lg font-medium text-accent-fg">
              Another round
            </button>
          </div>
          <DrillLink />
        </main>
      </>
    );
  }

  const answered = picked !== null;
  const last = index === total - 1;
  return (
    <>
      {header}
      <main className="screen min-h-0 flex-1 px-4 pt-6">
        <WordQuestion question={question} index={index} picked={picked} onPick={pick} />
        {answered ? (
          <div className="mt-2 grid grid-cols-2 gap-3">
            <button
              type="button"
              data-testid="next"
              ref={focusOnMount}
              onClick={() => {
                if (last) clearRound();
                else saveRound({ questions, index: index + 1, picked: null, missed });
                setPicked(null);
                setIndex(index + 1);
              }}
              className="min-h-12 rounded-xl bg-accent text-lg font-medium text-accent-fg"
            >
              {last ? 'Finish' : 'Next'}
            </button>
            <button type="button" onClick={askTutor} className="min-h-12 rounded-xl border border-line text-lg font-medium">
              Ask the tutor
            </button>
          </div>
        ) : null}
        <div className="pb-4">
          <DrillLink />
        </div>
      </main>
    </>
  );
}
