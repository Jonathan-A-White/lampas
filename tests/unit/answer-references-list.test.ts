// tests/unit/answer-references-list.test.ts — the references an answer is saved with as a verse list (mw-5r3p30.929): the ones its links stand for, in answer order, each once, a run of chapters as its chapters.
import { describe, expect, it } from 'vitest';
import { answerReferences } from '../../src/lists/answerRefs';
import { listedOf } from '../../src/lists/canonical';

// his top five on 'Talk about Revelation 10' (the words of 2026-10-31), a little longer
const REVELATION = [
  'Here is a top five, ordered by how much light each throws on Revelation. 1. Daniel, above all chapters 2, 7 and 10 to 12: the statue and kingdoms, the Son of Man.',
  '',
  '2. Ezekiel 10 is the vision; verses 21 and 22 are the faces.',
  '',
  '- Isaiah 6:1-8 and Ps. 110 come next, then Daniel 7 again.',
  '- Zechariah 4, with a count of 3 times and a year, 2026.',
].join('\n');

describe('answerReferences', () => {
  it('lists what the links of the Revelation answer stand for, in answer order, a run of chapters as its chapters', () => {
    expect(answerReferences(REVELATION)).toEqual(['Dan.2', 'Dan.7', 'Dan.10', 'Dan.11', 'Dan.12', 'Ezek.10', 'Ezek.10.21', 'Ezek.10.22', 'Isa.6.1-8', 'Ps.110', 'Zech.4']);
  });

  it('keeps a range of verses as one entry and a reference named twice once', () => {
    expect(answerReferences('Heb 7:1-3 and Romans 8:28, then Heb 7:1-3 again.')).toEqual(['Heb.7.1-3', 'Rom.8.28']);
  });

  it('keeps every string as a verse list reads it', () => {
    for (const canonical of answerReferences(REVELATION)) expect(listedOf(canonical), canonical).not.toBeNull();
  });

  it('finds nothing in an answer with no reference, or in the words of a link or a code span', () => {
    expect(answerReferences('Nothing here but words.')).toEqual([]);
    expect(answerReferences('`Romans 8` and [Romans 9](https://example.org)')).toEqual([]);
  });
});
