// src/diagram/validate.ts — the exactly-once rule of the sentence diagram (mw-souyao.1): every word sent appears once across the tree, none twice, none missing,
// and a clause has a subject and a verb. Every fault is named, so the grind can ask once more with what was wrong. An implied-only subject is allowed (a Greek verb's ending,
// an English imperative); so is an implied-only verb (an understood 'is'): an empty slot is one with no word of any kind.
import type { Clause, Diagram, DiagramWords, Modifier, Slot, TokenRef } from './types';

export type FaultKind = 'out-of-range' | 'used-twice' | 'missing' | 'empty-subject' | 'empty-verb' | 'empty-independent' | 'bad-apart' | 'bare-verb' | 'bare-leg';

export interface Fault {
  kind: FaultKind;
  /** the word index, for the three faults about a word */
  index?: number;
  /** where in the tree: 'clause 1 > verb > modifier 2 > object' */
  at: string;
  message: string;
}

export type Validation = { ok: true } | { ok: false; faults: Fault[] };

const isRange = (i: number, count: number): boolean => Number.isInteger(i) && i >= 0 && i < count;

/** `ok`, or every fault: a word index out of range, a word used twice, a word missing, an empty subject or verb. */
export function validateDiagram(tree: Diagram, wordCount: number): Validation {
  const faults: Fault[] = [];
  const first = new Map<number, string>();
  const twice = new Set<number>();
  let clauses = 0;

  const word = (ref: TokenRef, at: string): void => {
    if (!('i' in ref)) return;
    const i = ref.i;
    if (!isRange(i, wordCount)) {
      faults.push({ kind: 'out-of-range', index: i, at, message: `word ${i} is out of range (the verse has words 0 to ${wordCount - 1}), at ${at}` });
      return;
    }
    const before = first.get(i);
    if (before === undefined) {
      first.set(i, at);
    } else if (!twice.has(i)) {
      twice.add(i);
      faults.push({ kind: 'used-twice', index: i, at, message: `word ${i} is used twice, at ${before} and at ${at}` });
    }
  };

  const slot = (s: Slot, at: string): void => {
    s.words.forEach((w) => word(w, at));
    modifiers(s.modifiers, at);
  };

  const modifiers = (list: Modifier[], at: string): void => {
    list.forEach((m, k) => {
      const here = `${at} > modifier ${k + 1}`;
      if (m.kind === 'word') {
        word(m.word, here);
        modifiers(m.modifiers, here);
      } else if (m.kind === 'prepositional') {
        word(m.preposition, here);
        slot(m.object, `${here} > object`);
      } else {
        if (m.connector) word(m.connector, `${here} > connector`);
        clause(m.clause, `${here} > clause`);
      }
    });
  };

  const clause = (c: Clause, at: string): void => {
    clauses += 1;
    const place = `${at} ${clauses}`;
    if (c.subject.words.length === 0) faults.push({ kind: 'empty-subject', at: place, message: `the subject has no word, at ${place}` });
    if (c.verb.words.length === 0) faults.push({ kind: 'empty-verb', at: place, message: `the verb has no word, at ${place}` });
    slot(c.subject, `${place} > subject`);
    slot(c.verb, `${place} > verb`);
    if (c.complement) slot(c.complement.slot, `${place} > ${c.complement.kind}`);
    c.independent?.forEach((e, k) => {
      const here = `${place} > ${e.kind} ${k + 1}`;
      if (e.slot.words.length === 0) faults.push({ kind: 'empty-independent', at: here, message: `the ${e.kind} has no word, at ${here}` });
      slot(e.slot, here);
    });
  };

  tree.clauses.forEach((entry, k) => {
    if (entry.joinedBy) word(entry.joinedBy, `clause ${k + 1} > joining word`);
    clause(entry.clause, 'clause');
  });

  for (let i = 0; i < wordCount; i += 1) {
    if (!first.has(i)) faults.push({ kind: 'missing', index: i, at: 'the tree', message: `word ${i} is missing from the tree` });
  }
  return faults.length === 0 ? { ok: true } : { ok: false, faults };
}

/**
 * THE SECOND RULE (mw-5r3p30.1233): what is DRAWN has a word in every place. The tree can keep THE RULE and still draw a bare place, because the Weave (weave.ts) draws the English words
 * of a chunk it shows in Greek as nothing (text ''): the verb 'have heard' of 'we have heard' becomes an empty verb slot, and 'own' of 'our own' a leg with no word. `words` are the words as drawn.
 * A fault for a verb slot with no drawn word ('bare-verb') and for each other place left with no drawn word ('bare-leg': a subject, an object or a complement slot, a word modifier,
 * a preposition or the object it takes); an understood word, in parentheses, is drawn and counts. repairEmptied (emptied.ts) is what leaves none.
 */
export function drawnFaults(tree: Diagram, words: DiagramWords): Fault[] {
  const faults: Fault[] = [];
  let clauses = 0;
  const blank = (ref: TokenRef): boolean => 'i' in ref && words[ref.i]?.text === '';
  const bare = (s: Slot): boolean => s.words.every(blank);

  const slot = (s: Slot, at: string): void => {
    if (bare(s)) faults.push({ kind: 'bare-leg', at, message: `nothing is drawn in the place at ${at}` });
    modifiers(s.modifiers, at);
  };
  const modifiers = (list: Modifier[], at: string): void => {
    list.forEach((m, k) => {
      const here = `${at} > modifier ${k + 1}`;
      if (m.kind === 'word') {
        if (blank(m.word)) faults.push({ kind: 'bare-leg', at: here, message: `a line is drawn with no word on it, at ${here}` });
        modifiers(m.modifiers, here);
      } else if (m.kind === 'prepositional') {
        if (blank(m.preposition)) faults.push({ kind: 'bare-leg', at: here, message: `a preposition's line is drawn with no word on it, at ${here}` });
        slot(m.object, `${here} > object`);
      } else {
        clause(m.clause, `${here} > clause`);
      }
    });
  };
  const clause = (c: Clause, at: string): void => {
    clauses += 1;
    const place = `${at} ${clauses}`;
    if (bare(c.verb)) faults.push({ kind: 'bare-verb', at: place, message: `the verb's place is drawn with no word, at ${place}` });
    slot(c.subject, `${place} > subject`);
    modifiers(c.verb.modifiers, `${place} > verb`);
    if (c.complement) slot(c.complement.slot, `${place} > ${c.complement.kind}`);
    c.independent?.forEach((e, k) => slot(e.slot, `${place} > ${e.kind} ${k + 1}`));
  };
  tree.clauses.forEach((entry) => clause(entry.clause, 'clause'));
  return faults;
}
