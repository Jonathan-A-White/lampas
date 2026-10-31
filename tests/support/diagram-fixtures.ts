// tests/support/diagram-fixtures.ts — the two hand-written diagrams of Colossians 3:1 (tests/fixtures/diagrams, mw-souyao.1) and the little trees the layout tests add.
import { readFileSync } from 'node:fs';
import type { Clause, Diagram, DiagramMode, DiagramWords, Slot } from '../../src/diagram/types';

export interface DiagramFixture {
  reference: string;
  mode: DiagramMode;
  words: DiagramWords;
  diagram: Diagram;
}

export function loadFixture(mode: DiagramMode): DiagramFixture {
  return JSON.parse(readFileSync(`tests/fixtures/diagrams/${mode === 'hebrew' ? 'gen-1-1' : 'col-3-1'}-${mode}.json`, 'utf8')) as DiagramFixture;
}

/** A slot of real words (their indices) and no modifiers. */
export const slotOf = (...indices: number[]): Slot => ({ words: indices.map((i) => ({ i })), modifiers: [] });

/** 'Dogs bark': the smallest sentence. */
export const dogsBark: Clause = { subject: slotOf(0), verb: slotOf(1) };

export const wordsOf = (...texts: string[]): DiagramWords => texts.map((text, chunk) => ({ text, chunk }));
