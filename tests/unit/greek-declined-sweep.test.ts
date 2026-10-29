// A reader who said no to the Greek offer (memory.index 'said no to the Greek offer <date>') is answered in English with
// no Greek: mw-5r3p30.365. The 2026-10-14 smoke found the retired verse-ask grind giving him a `words` entry for 'What does "love" really
// mean here?', because its instructions let "asks what the original says" cover a question about an English word, and its
// "How to answer" told it to cite Greek words without an exception. Every grind that is sent `memory` keeps one scenario of
// this reader, so the smoke sees a leak in any of them.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { instructionsOf } from '../../scripts/grind-parts';
import '../support/grinds-in-graph';

const read = (rel: string): string => readFileSync(rel, 'utf8');
type Example = { request: { memory?: { index: string }; reader_view?: string }; expect: Record<string, Record<string, unknown>> };
const example = (kind: string, name: string): Example => JSON.parse(read(`grinds/examples/${kind}/${name}.json`)) as Example;

const NO = 'said no to the Greek offer';
const GREEK_LETTERS = /[Ͱ-Ͼἀ-῿]/;

// mw-5r3p30.376: after mw-5r3p30.344 added 'A word he asks about by name is the one he wants explained' the smoke failed again,
// because 'Teach a new word on the spot' read the English word 'love' as a word to teach. The said-no rule is stated once in each
// grind that teaches words, and every rule that teaches a word points to it and says it is about a GREEK word.
describe('teaching a word yields to the reader who said no to the Greek', () => {
  const talk = instructionsOf('bible-talk');
  const bullet = (text: string): string => {
    const at = text.indexOf('- Teach a new word on the spot. ');
    return text.slice(at, text.indexOf('\n- ', at + 1));
  };
  const byName = (text: string): string => {
    const at = text.indexOf('word he asks about by name');
    return text.slice(at, text.indexOf('\n', at));
  };

  it('bible-talk says an English word he names gets an English answer with no `words`', () => {
    const section = talk.slice(talk.indexOf('## Offering the Greek'), talk.indexOf('## Teaching at his level'));
    expect(section).toMatch(/an English word he names[^.]*English[^.]*no `words`/i);
    expect(section).toContain(NO);
  });

  it('bible-talk: Teach a new word and the by-name line are about a Greek word and point to it', () => {
    expect(bullet(talk)).toMatch(/Greek word/);
    expect(bullet(talk)).toContain('Offering the Greek');
    expect(byName(talk)).toMatch(/Greek word/);
    expect(byName(talk)).toContain('Offering the Greek');
  });
});

describe('every grind sent `memory` has a scenario of the reader who said no', () => {
  it('bible-talk: no Greek offer, no words', () => {
    const e = example('bible-talk', 'greek-offer-after-no');
    expect(e.request.memory?.index).toContain(NO);
    expect(e.expect['words.0']).toEqual({ present: false });
    expect(e.expect.greek_offer).toEqual({ present: false });
  });

  it('tips: the grind says to offer him no tip about the Greek, and the scenario holds the tip free of Greek letters', () => {
    expect(instructionsOf('tips')).toContain(NO);
    const e = example('tips', 'english-reader-said-no');
    expect(e.request.memory?.index).toContain(NO);
    expect(e.expect['tip']).toEqual({ is_null: false });
    expect(e.expect['tip.body'].matches).toBeDefined();
    expect(new RegExp(e.expect['tip.body'].matches as string).test('Hear a verse read aloud.')).toBe(true);
    expect(new RegExp(e.expect['tip.body'].matches as string).test('Try the word ἀγάπη.')).toBe(false);
  });

  it('verse-read: the scenario holds the note free of Greek letters', () => {
    const e = example('verse-read', 'english-reader-said-no');
    expect(e.request.memory?.index).toContain(NO);
    const re = new RegExp(e.expect.note.matches as string);
    expect(re.test('Well read. Take the last phrase a little slower.')).toBe(true);
    expect(re.test('Say ἀγαπῶσιν slowly.')).toBe(false);
    expect(GREEK_LETTERS.test('ἀγαπῶσιν')).toBe(true);
  });
});
