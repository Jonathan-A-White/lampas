// Which words of the verse the reading check marks: the exact position the grind named (focus word `index`), never every
// word with the same spelling (mw-5r3p30.94).
import { describe, expect, it } from 'vitest';
import type { FixWord } from '../../src/data/repositories';
import { markWords } from '../../src/services/reading';

const fix = (word: string, index?: number): FixWord => ({ word, chunks: [word], tip: 'Say it again.', ...(index === undefined ? {} : { index }) });
const LIFE = 'And this is the life ... the eternal life ...';

describe('markWords', () => {
  it('marks only the first life when the focus word names the first position', () => {
    const { marked, lost } = markWords(LIFE, [fix('life', 4)]);
    expect([...marked.keys()]).toEqual([4]);
    expect(lost).toEqual([]);
  });

  it('marks only the last to when the focus word names its position', () => {
    const text = 'God to us, to love and to us';
    const tokens = text.split(/\s+/);
    const last = tokens.lastIndexOf('to');
    const { marked } = markWords(text, [fix('to', last)]);
    expect([...marked.keys()]).toEqual([last]);
  });

  it('marks the position named even when the mill leaves out the accents or the case', () => {
    const { marked } = markWords('ὁ λόγος καὶ ὁ λόγος', [fix('Λογος', 4)]);
    expect([...marked.keys()]).toEqual([4]);
  });

  it('offers a word whose position is not in the verse after it, so no mark is lost', () => {
    const { marked, lost } = markWords(LIFE, [fix('life', 99)]);
    expect(marked.size).toBe(0);
    expect(lost.map((w) => w.word)).toEqual(['life']);
  });

  it('marks the same spelling at its own position twice when both instances were misread', () => {
    const { marked } = markWords(LIFE, [fix('life', 4), fix('life', 8)]);
    expect([...marked.keys()]).toEqual([4, 8]);
  });

  it('falls back to every instance for a kept reading that has no position', () => {
    const { marked } = markWords(LIFE, [fix('life')]);
    expect([...marked.keys()]).toEqual([4, 8]);
  });
});
