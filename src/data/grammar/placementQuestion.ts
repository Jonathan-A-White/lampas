// src/data/grammar/placementQuestion.ts — the question the placement asks next (mw-hqd5bz.8), pure: the idea being asked, built by questions.ts from
// the state's seed, so the same state gives the same question. A second question on an idea is not the first again.
import type { Chapter } from '../chapter';
import { mulberry32 } from '../quiz';
import { ideaOf } from './ladder';
import { currentIdea, questionSeed, type PlacementState } from './placement';
import { buildIdeaQuestion, type GrammarQuestion, type Respell } from './questions';

/** The question for the idea being asked; `before` is the question just asked, which a question on the same idea must differ from. */
export function questionFor(state: PlacementState, passage: readonly Chapter[], before: GrammarQuestion | null, respell?: Respell): GrammarQuestion {
  const idea = ideaOf(currentIdea(state)!);
  const build = (tries: number) => buildIdeaQuestion(idea, passage, mulberry32((questionSeed(state) + tries * 104729) >>> 0), respell);
  const same = (q: GrammarQuestion) => before?.ideaId === q.ideaId && before.prompt === q.prompt && before.right === q.right && before.form === q.form;
  let question = build(0);
  for (let tries = 1; tries <= 5 && same(question); tries += 1) question = build(tries);
  return question;
}
