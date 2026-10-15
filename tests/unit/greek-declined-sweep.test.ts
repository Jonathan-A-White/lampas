// A reader who said no to the Greek offer (memory.index 'said no to the Greek offer <date>') is answered in English with
// no Greek: mw-5r3p30.365. The 2026-10-14 smoke found verse-ask giving him a `words` entry for 'What does "love" really
// mean here?', because its instructions let "asks what the original says" cover a question about an English word, and its
// "How to answer" told it to cite Greek words without an exception. Every grind that is sent `memory` keeps one scenario of
// this reader, so the smoke sees a leak in any of them.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (rel: string): string => readFileSync(rel, 'utf8');
type Example = { request: { memory?: { index: string }; reader_view?: string }; expect: Record<string, Record<string, unknown>> };
const example = (kind: string, name: string): Example => JSON.parse(read(`grinds/examples/${kind}/${name}.json`)) as Example;

const NO = 'said no to the Greek offer';
const GREEK_LETTERS = /[Ͱ-Ͼἀ-῿]/;

describe('verse-ask for a reader who said no to the Greek', () => {
  const text = read('grinds/verse-ask.instructions.md');
  const section = text.slice(text.indexOf('## English for a reader not learning the Greek'), text.indexOf('## When he is not ready for the question'));

  it('says an English word\'s meaning is not a request for the Greek, and keeps `words` empty', () => {
    expect(section).toContain(NO);
    expect(section).toMatch(/what an English word\s+means/);
    expect(section).toMatch(/not (?:a request|asking) for the Greek/);
    expect(section).toContain('`words` stays empty');
    expect(section).toMatch(/no Greek letters in `answer`/);
  });

  it('makes the cite-the-Greek rule yield to it', () => {
    const how = text.slice(text.indexOf('## How to answer'));
    expect(how).toMatch(/except for a reader not learning the Greek/i);
  });

  it('has the scenario, and it wants no `words`', () => {
    const e = example('verse-ask', 'english-reader-said-no');
    expect(e.request.memory?.index).toContain(NO);
    expect(e.expect['words.0']).toEqual({ present: false });
    expect(e.expect.answer.matches).toBeDefined();
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
    expect(read('grinds/tips.instructions.md')).toContain(NO);
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
