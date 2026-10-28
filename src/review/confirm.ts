// src/review/confirm.ts — confirming a missed idea (mw-indx1x6.2, docs/grammar.md 'Confirming a missed idea', PROVISIONAL). The Governor: "With these, I'm just remembering the right answer." So an idea he
// missed before and then answers right is not yet known: it is marked 'to confirm' and the mill is asked, in the background, for questions he has not been asked; it counts as known when one of those is
// right, and a miss on one returns it to missed. Review, Drill it, the short drill and Prove it hand each answer here. Nothing here is waited on by a screen: the answer's feedback is drawn first.
// The rule is learn-kit/fresh's recordAnswer (mw-74h98vg.1): it notes the question as asked and returns what the answer is, and this file writes Lampas's rows from the verdict.
import { isFresh, recordAnswer, type FreshStore } from 'learn-kit/fresh';
import { isFetchable } from '../data/grammar/fetchedItems';
import { ideaOfAny as ideaOf } from '../data/grammar/ladders';
import type { GrammarQuestion } from '../data/grammar/questions';
import { fetchedStock, freshStore, isFreshQuestion, isToConfirm, markConfirmed, missedBefore, noteSeen, questionKey, recordGrammarAnswer } from '../data/repositories';

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

/** The ledger as if the key were in it, and the key never written: for a question that cannot be fresh (a built one is noted afterwards, one about no verse is never noted). */
const asSeen = (store: FreshStore, key: string): FreshStore => ({ ...store, getAsked: async (ideaId) => [...(await store.getAsked(ideaId)), key], putAsked: async () => undefined });

/**
 * What one answer on a question does to the idea's 'to confirm' mark. A fresh question (one the mill wrote, not asked before) on an idea he missed before or that is marked: right clears the mark and the idea counts as
 * known (its row takes the right answer), wrong clears it and the row takes a miss, so the idea is missed again. Any other right answer on an idea he missed before marks it and asks the mill, in the
 * background, for fresh questions; a wrong one takes the mark off. An idea he never missed, and one the mill is not asked about (a letter, a sound), is left alone. The question is noted as asked
 * (the ledger), the hinted ones too. Never throws.
 */
export async function confirmAnswer(question: GrammarQuestion, right: boolean, options: ConfirmOptions = {}): Promise<void> {
  try {
    const id = question.ideaId;
    if (!fetchable(id)) return;
    if (options.hinted && right) {
      await noteSeen(question);
      return;
    }
    const marked = await isToConfirm(id);
    const missed = options.wasMissed ?? (await missedBefore(id));
    // only a question the mill wrote can confirm: a built one may be one he has met before, so it is read as seen
    const key = questionKey(question);
    const writes = isFreshQuestion(question) && question.ref ? freshStore : asSeen(freshStore, key);
    const fresh = await isFresh(writes, id, key);
    const verdict = await recordAnswer(writes, id, key, right, { missedBefore: missed });
    if (writes !== freshStore) await noteSeen(question);
    if (fresh && (marked || missed)) {
      if (!options.rowWritten) await recordGrammarAnswer(id, right);
      if (verdict === 'known') await markConfirmed(id);
      return;
    }
    // not waited for: the feedback of the answer does not depend on the mill
    if (verdict === 'to-confirm' && !marked) fetchedStock.rightAfterMiss(id);
  } catch (error) {
    console.warn('could not confirm the idea', error);
  }
}
