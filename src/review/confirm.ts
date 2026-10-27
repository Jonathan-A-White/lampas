// src/review/confirm.ts — confirming a missed idea (mw-indx1x6.2, docs/grammar.md 'Confirming a missed idea', PROVISIONAL). The Governor: "With these, I'm just remembering the right answer." So an idea he
// missed before and then answers right is not yet known: it is marked 'to confirm' and the mill is asked, in the background, for questions he has not been asked; it counts as known when one of those is
// right, and a miss on one returns it to missed. Review, Drill it, the short drill and Prove it hand each answer here. Nothing here is waited on by a screen: the answer's feedback is drawn first.
import { isFetchable } from '../data/grammar/fetchedItems';
import { ideaOf } from '../data/grammar/ladder';
import type { GrammarQuestion } from '../data/grammar/questions';
import { clearToConfirm, isFreshQuestion, isToConfirm, markToConfirm, missedBefore, recordGrammarAnswer } from '../data/repositories';
import { askForMoreItems } from './moreItems';

export interface ConfirmOptions {
  /** the answer is on the idea's schedule row already (Review writes it); a drill's is not, and a fresh answer on an idea to confirm is written here */
  rowWritten?: boolean;
  /** he was helped (a Hint): a right answer then confirms nothing and marks nothing */
  hinted?: boolean;
  /** whether the idea was one he missed before, read before the answer was written (read here when not given) */
  wasMissed?: boolean;
}

const fetchable = (ideaId: string): boolean => {
  try {
    return isFetchable(ideaOf(ideaId));
  } catch {
    return false;
  }
};

/**
 * What one answer on a question does to the idea's 'to confirm' mark. A fresh question (one the mill wrote) on an idea he missed before or that is marked: right clears the mark and the idea counts as
 * known (its row takes the right answer), wrong clears it and the row takes a miss, so the idea is missed again. Any other right answer on an idea he missed before marks it and asks the mill, in the
 * background, for fresh questions; a wrong one takes the mark off. An idea he never missed, and one the mill is not asked about (a letter, a sound), is left alone. Never throws.
 */
export async function confirmAnswer(question: GrammarQuestion, right: boolean, options: ConfirmOptions = {}): Promise<void> {
  try {
    const id = question.ideaId;
    if (!fetchable(id) || (options.hinted && right)) return;
    const marked = await isToConfirm(id);
    const missed = options.wasMissed ?? (await missedBefore(id));
    if (isFreshQuestion(question) && (marked || missed)) {
      if (!options.rowWritten) await recordGrammarAnswer(id, right);
      await clearToConfirm(id, right);
      return;
    }
    if (!right) {
      if (marked) await clearToConfirm(id);
      return;
    }
    if (marked || !missed) return;
    await markToConfirm(id);
    // not waited for: the feedback of the answer does not depend on the mill
    void askForMoreItems([id]);
  } catch (error) {
    console.warn('could not confirm the idea', error);
  }
}
