// src/tutor/drillTalk.ts — what the tutor is told on the results of a drill (mw-5r3p30.649, docs/ask-tutor.md 'Talk from a drill's results'): Drill it's end and the short drill's.
// The screen reports `drill`, one entry for each question he was asked: the idea it tests, what was asked, the answer he gave, the right answer and whether he was right. The
// results go to the tutor as data in the request (the bible-talk grind's `screen.drill`), not as words he reads. Pure: the screens call it, src/AskTutor.tsx sends it.
import type { GrammarQuestion } from '../data/grammar/questions';
import { ideaOf } from '../data/grammar/ladder';
import { DRILL_SCREEN, type ScreenContext, type ScreenDrillAnswer, type ScreenFact } from './screen';

/** One question of a run and what he did with it. */
export interface DrillTry {
  question: GrammarQuestion;
  /** the option he tapped */
  picked: string;
  /** a Hint took wrong answers away first */
  hinted: boolean;
}

/** What was asked, in words: the prompt and the Greek it is about (the form with its blank, the word, or the verse's words). */
function askedOf(q: GrammarQuestion): string {
  const about = q.form ?? q.words?.join(' ');
  return about ? `${q.prompt} ${about}` : q.prompt;
}

function answerOf({ question: q, picked, hinted }: DrillTry): ScreenDrillAnswer {
  return {
    idea: q.facet?.label ?? ideaOf(q.ideaId).title,
    asked: askedOf(q),
    answer: picked,
    right_answer: q.right,
    right: picked === q.right,
    ...(hinted && picked === q.right ? { hinted: true as const } : {}),
  };
}

/**
 * The screen a drill's results report: the idea, how the run ended (`headline`: 'Proved', 'You reached step 2 of 4', '3 of 5 right'), how many questions were right, the
 * facets that were strong and weak when the run has them, and every question as `drill`.
 */
export function drillScreen({ idea, headline, tries, strong = [], weak = [] }: {
  idea: string;
  headline: string;
  tries: readonly DrillTry[];
  strong?: readonly string[];
  weak?: readonly string[];
}): ScreenContext {
  const drill = tries.map(answerOf);
  const right = drill.filter((d) => d.right).length;
  const facts: ScreenFact[] = [
    { label: 'Idea', value: idea },
    { label: 'Result', value: headline },
    { label: 'Questions', value: `${drill.length} asked, ${right} right, ${drill.length - right} wrong` },
    ...(strong.length > 0 ? [{ label: 'Strong', value: strong.join('; ') }] : []),
    ...(weak.length > 0 ? [{ label: 'Weak', value: weak.join('; ') }] : []),
  ];
  return { name: DRILL_SCREEN, facts, drill };
}

/** The questions the sheet opens with on a drill's results: the first is about the misses when there were any, else about what to practise next. */
export function drillSuggestions(screen: ScreenContext): string[] {
  const missed = (screen.drill ?? []).some((d) => !d.right);
  return [missed ? 'Why did I get these wrong?' : 'What should I practise next?', 'Can you explain this idea again?'];
}
