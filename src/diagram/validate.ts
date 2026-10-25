// src/diagram/validate.ts — the exactly-once rule of the sentence diagram (mw-souyao.1): every word sent appears once across the tree, none twice, none missing,
// and a clause has a subject and a verb. Every fault is named, so the grind can ask once more with what was wrong. An implied-only subject is allowed (a Greek verb's ending,
// an English imperative); so is an implied-only verb (an understood 'is'): an empty slot is one with no word of any kind.
import type { Clause, Diagram, Modifier, Slot, TokenRef } from './types';

export type FaultKind = 'out-of-range' | 'used-twice' | 'missing' | 'empty-subject' | 'empty-verb';

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
