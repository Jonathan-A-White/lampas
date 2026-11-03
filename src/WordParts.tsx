// src/WordParts.tsx — how a word is built from its parts (mw-5r3p30.986 the lesson, mw-5r3p30.987 the drills; his feedback: 'this breakdown ... a part of the lesson and a part of the drills really help
// people remember'): the one place that lays the parts out, from src/data/wordParts.ts, so the lesson (the worked word and the word table), Drill it, the word flashcard and the word quiz say them in
// the same words and the same look. A word with no entry draws nothing, not an empty line. A drill draws it only after the answer, so the parts never give the answer away.
import type { GrammarQuestion } from './data/grammar/questions';
import { partsLine, partsOf } from './data/wordParts';
import { wordsOfQuestion } from './data/wordPartsOfQuestion';
import { greekMarked } from './ui/GreekMarked';

/**
 * `built`: 'Built from: οὐδέ “and not” + μία “one”' (under a worked word, and in a drill, whose card has just said the word);
 * `equals`: 'οὐδεμία = οὐδέ “and not” + μία “one”' (a row of a word table, where the word is not said beside it).
 */
export type PartsLook = 'built' | 'equals';

export function WordParts({ word, look = 'built', testId = 'word-parts', className = '' }: { word: string; look?: PartsLook; testId?: string; className?: string }) {
  const entry = partsOf(word);
  if (!entry) return null;
  const line = greekMarked(partsLine(entry), 'font-greek text-lg');
  return (
    <p data-testid={testId} data-word={word} className={`break-words text-base ${className}`}>
      {look === 'equals' ? <>{greekMarked(word, 'font-greek text-xl')} = </> : 'Built from: '}
      {line}
    </p>
  );
}

/** The parts of a drill question's words, under its answer: one line each, none when no word of it has parts. */
export function QuestionParts({ question, className = '' }: { question: GrammarQuestion; className?: string }) {
  const words = wordsOfQuestion(question);
  if (words.length === 0) return null;
  return (
    <div className={`text-center ${className}`}>
      {words.map((word) => (
        <WordParts key={word} word={word} />
      ))}
    </div>
  );
}
