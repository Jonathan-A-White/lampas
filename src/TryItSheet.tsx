// src/TryItSheet.tsx — Try it on a verse (mw-emk3xt.4, docs/grammar.md 'The idea sheet'): a full screen over the idea sheet that takes him from the idea to a verse he can now read. It
// picks the easiest verse of the goal (or the open chapter) at his level that has a form of the idea (data/grammar/ideaSheet.ts tryItOn) and asks three questions on it, one at a time as
// Review draws them (GrammarCard, multiple choice): what a chunk with the form says, the form (its ending, or tapping it), and a parsing of a word (who does what to whom when the verse is not
// yet at his level). Each answer is a grammar answer on the idea (recordGrammarAnswer) credited to what it shows of the letters (noteAnswer), as Review records one. At the end 'You got 2 of 3',
// 'Read it' (the verse, every sheet closed) and Done; 'idea-tried' goes on the bus. Stop leaves with what he answered kept.
import { useEffect, useRef, useState } from 'react';
import type { GrammarIdea } from './data/grammar/ladder';
import { drillSeed } from './data/grammar/drillSeed';
import { tryItOn, type IdeaPassage, type TryIt } from './data/grammar/ideaSheet';
import { mulberry32 } from './data/quiz';
import { listOpenedParadigms, noteAnswer, recordDrillStep, recordGrammarAnswer } from './data/repositories';
import { publish } from './events/bus';
import { GrammarCard } from './GrammarCard';
import { openVerseAt } from './nav/route';
import { gradingOf } from './review/kinds';
import { focusOnMount } from './ui/focus';
import { FootBar } from './ui/NextBar';
import { useSettled } from './ui/settle';
import { closeAllSheets, useSheetBack } from './ui/sheetBack';
import { useEscapeToClose } from './ui/sheetDrag';

const BUTTON = 'min-h-12 w-full rounded-xl border text-lg font-medium';

type Found = TryIt | 'none' | null;

/** The verse and its questions, read once when the screen opens (they do not change under his thumb as his levels do): null while it looks, 'none' when no verse has a form of the idea. */
function useTryIt(idea: GrammarIdea, passage: IdeaPassage): Found {
  const [found, setFound] = useState<Found>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [{ graded, passes }, opened] = await Promise.all([gradingOf(passage.chapters), listOpenedParadigms()]);
        const tried = tryItOn(idea, passage.chapters, graded, passes, new Set(opened), mulberry32(drillSeed.next()), passage.verse);
        if (alive) setFound(tried ?? 'none');
      } catch (error) {
        console.error('could not find a verse to try', error);
        if (alive) setFound('none');
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return found;
}

export function TryItSheet({ idea, passage, onClose }: { idea: GrammarIdea; passage: IdeaPassage; onClose: () => void }) {
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  const found = useTryIt(idea, passage);
  const tried = found && found !== 'none' ? found : null;
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [right, setRight] = useState(0);
  // the writes follow one another, so the last is on the schedule before the end card says so
  const writing = useRef<Promise<unknown>>(Promise.resolve());
  const total = tried?.questions.length ?? 0;
  const over = tried !== null && index >= total;
  const question = tried && !over ? tried.questions[index] : null;
  // Done and Read it stand where Finish was: a second tap of a double tap on Finish waits for the card to settle (src/ui/settle.ts)
  const settled = useSettled(index);
  const told = useRef(false);

  useEffect(() => {
    if (!over || told.current) return;
    told.current = true;
    void writing.current.then(() => publish({ kind: 'idea-tried', id: idea.id, right, total }));
  }, [over, idea.id, right, total]);

  const pick = (option: string): void => {
    if (!question || picked !== null) return;
    const wasRight = option === question.right;
    setPicked(option);
    if (wasRight) setRight((n) => n + 1);
    writing.current = writing.current
      .then(async () => {
        await recordGrammarAnswer(idea.id, wasRight);
        // a form read right shows its letters, sounds and marks; a miss on a letter or sound counts against it (mw-hqd5bz.17)
        await noteAnswer(question, wasRight);
      })
      .catch((error: unknown) => console.error('could not record the answer', error));
  };
  const step = (parsing: { id: string }, wasRight: boolean): void => {
    const lemma = question?.lemma;
    if (!lemma) return;
    writing.current = writing.current.then(() => recordDrillStep(lemma, parsing.id, wasRight)).catch((error: unknown) => console.error('could not record the step', error));
  };
  const next = (): void => {
    setIndex((n) => n + 1);
    setPicked(null);
  };
  const readIt = (): void => {
    if (!tried) return;
    closeAllSheets();
    openVerseAt({ book: tried.verse.code, chapter: tried.verse.chapter, verse: tried.verse.verse });
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Try it" className="fixed inset-0 z-40 flex flex-col bg-surface">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-1">
        <div className="min-w-0 flex-1">
          <h2 data-testid="try-it-title" className="title-wrap text-lg font-bold">
            {tried ? `Try it: ${tried.ref}` : `Try it: ${idea.title}`}
          </h2>
          {tried && !over ? (
            <p data-testid="try-it-step" className="title-wrap text-sm text-muted">
              Question {index + 1} of {total} · {idea.title}
            </p>
          ) : null}
        </div>
        {over ? null : (
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
            Stop
          </button>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3">
        {found === null ? (
          <p data-testid="try-it-loading" className="text-lg text-muted">
            Finding a verse…
          </p>
        ) : found === 'none' ? (
          <p className="text-lg">No verse of {passage.title} has a form of this idea.</p>
        ) : over ? (
          <div data-testid="try-it-result">
            <h3 className="text-2xl font-bold">
              You got {right} of {total}
            </h3>
            <p className="mt-1 text-base text-muted">Each answer is kept with the others on {idea.title}. Read {tried?.ref} now, with what you have just met.</p>
          </div>
        ) : question ? (
          <GrammarCard key={index} question={question} mode="choice" picked={picked} onPick={pick} onStep={step} sideBySide />
        ) : null}
      </div>
      <FootBar>
        {over ? (
          <div className="flex gap-2">
            <button type="button" ref={focusOnMount} onClick={() => settled() && readIt()} className={`${BUTTON} border-accent bg-accent text-accent-fg`}>
              Read it
            </button>
            <button type="button" onClick={() => settled() && onClose()} className={`${BUTTON} border-line text-accent active:bg-line`}>
              Done
            </button>
          </div>
        ) : found === 'none' ? (
          <button type="button" ref={focusOnMount} onClick={onClose} className={`${BUTTON} border-accent bg-accent text-accent-fg`}>
            Done
          </button>
        ) : picked !== null ? (
          <button type="button" data-testid="try-it-next" ref={focusOnMount} onClick={next} className={`${BUTTON} border-accent bg-accent text-accent-fg`}>
            {index === total - 1 ? 'Finish' : 'Next'}
          </button>
        ) : null}
      </FootBar>
    </div>
  );
}
