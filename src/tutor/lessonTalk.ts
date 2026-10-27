// src/tutor/lessonTalk.ts — what the tutor is told on a lesson (mw-5r3p30.818, docs/ask-tutor.md 'Talk from a lesson'): the idea sheet's Ask the tutor opens a talk about the
// lesson in hand, whose screen is the lesson: its id and title, what it is, the level he holds on it, the worked example (word, meaning, verse, respelling) and the steps the sheet
// shows. Pure: the sheet calls it, src/AskTutor.tsx (LessonTalkSheet) sends it.
import type { GrammarIdea } from '../data/grammar/ladder';
import type { Teach, WorkedExample } from '../data/grammar/teach';
import type { GrammarLevelName } from '../data/repositories';
import type { ScreenContext, ScreenFact } from './screen';

/** The name every lesson goes by; the lesson itself is the `Lesson` and `Lesson id` facts. */
export const LESSON_SCREEN = 'Lesson';

/** The level as the sheet's slider names it. */
const LEVEL_LABELS: Record<GrammarLevelName, string> = { notYet: 'Not yet', frontier: 'Learning', solid: 'I know it' };

/** The key a lesson's talk is kept under: one for each lesson, so a lesson's talk is never another's. */
export const lessonKept = (ideaId: string): string => `screen.lesson.${ideaId}`;

/**
 * The screen a lesson reports. `steps` are the worked example's lines as the sheet shows them (the facts number them), `respelling` the word said in his scheme (a Hebrew lesson has
 * none), `inPassage` whether the word is in the verse he is reading, `level` what he holds on the idea (undefined until it is read).
 */
export function lessonScreen({ idea, card, worked, inPassage, steps, respelling, level }: {
  idea: Pick<GrammarIdea, 'id' | 'title'>;
  card: Pick<Teach, 'whatItIs'>;
  worked: Pick<WorkedExample, 'word' | 'gloss' | 'ref'>;
  inPassage: boolean;
  steps: readonly string[];
  respelling?: string;
  level: GrammarLevelName | undefined;
}): ScreenContext {
  const where = [worked.ref, inPassage ? 'the verse he is reading' : undefined].filter(Boolean).join(', ');
  const facts: ScreenFact[] = [
    { label: 'Lesson', value: idea.title },
    { label: 'Lesson id', value: idea.id },
    ...(level ? [{ label: 'Your level', value: LEVEL_LABELS[level] }] : []),
    { label: 'What it is', value: card.whatItIs },
    { label: 'Worked example', value: `${worked.word} “${worked.gloss}”${where ? ` · ${where}` : ''}` },
    ...(respelling ? [{ label: 'Say it', value: respelling }] : []),
    ...(steps.length > 0 ? [{ label: 'Steps shown', value: steps.map((s, i) => `${i + 1}. ${s}`).join(' ') }] : []),
  ];
  return { name: LESSON_SCREEN, facts };
}

/** The questions the sheet opens with on a lesson. */
export const lessonSuggestions = (title: string): string[] => [`Can you explain ${title} in plain words?`, `Why is the worked example in ${title} done that way?`];
