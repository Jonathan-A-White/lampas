// The verse-read note is spoken aloud by the phone's English voice (the reading check's verdict, mw-5r3p30.93), so it must say what
// the scorer HEARD (mw-neuq78.11: never the target text quoted as heard) and use no word the voice reads wrongly, above all the
// past tense of read ('You read both words' comes out as 'You reed both words').
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { checkExpect, expectProblems, type GrindExample } from '../support/grind-examples';
import type { Schema } from '../support/schema-validate';
import { instructionsOf } from '../../scripts/grind-parts';

const readJson = (rel: string): unknown => JSON.parse(readFileSync(rel, 'utf8'));
const DIR = 'grinds/examples/verse-read';
const exampleFiles = readdirSync(DIR).filter((f) => f.endsWith('.json'));
const examples = exampleFiles.map((f) => ({ file: f, example: readJson(`${DIR}/${f}`) as GrindExample }));
const answerSchema = readJson('grinds/verse-read.answer.schema.json') as Schema;

/** A note the model must not write, and one it may. `matches` is all the mill's smoke can say, so a pattern forbids by describing every other string. */
const BAD_NOTES = [
  'You read all four words, and I heard "μὴ" clearly.',
  'you read it through and I heard every word.',
  'Nearly there: YOU READ the verse well.',
];
const GOOD_NOTES = [
  'You said all four words, and I heard every one clearly.',
  'You got through the whole verse. Hold Read and try once more.',
  'I heard "antote" for the first word: start with the p.',
];
const noteAnswer = (note: string) => ({ verdict: 'some-to-fix', focus_words: [], note });
const noteCheck = (example: GrindExample) => ({ note: example.expect.note });

describe('every verse-read scenario forbids the past tense of read in the note', () => {
  it('has scenarios', () => expect(examples.length).toBeGreaterThanOrEqual(4));

  describe.each(examples)('$file', ({ example }) => {
    it('puts a pattern on the note that the mill (RE2) can read', () => {
      expect(example.expect.note?.matches, 'expect.note.matches').toBeTypeOf('string');
      expect(expectProblems(example.expect, answerSchema)).toEqual([]);
    });
    it.each(BAD_NOTES)('refuses %s', (note) => expect(checkExpect(noteCheck(example), noteAnswer(note))).not.toEqual([]));
    it.each(GOOD_NOTES)('accepts %s', (note) => expect(checkExpect(noteCheck(example), noteAnswer(note))).toEqual([]));
  });
});

describe('the Thessalonians scenario (his screenshot of 1 Thessalonians 5:16)', () => {
  const found = examples.find((e) => e.example.request.target_text === 'Πάντοτε χαίρετε');

  it('is there: Greek, the verse as written, with a recording', () => {
    expect(found, 'a scenario for target_text "Πάντοτε χαίρετε"').toBeDefined();
    expect(found?.example.request).toMatchObject({ reference: '1 Thessalonians 5:16', lang: 'el' });
    expect(found?.example.photos).toHaveLength(1);
  });

  it('refuses the note he saw, which quotes the verse as written as what was heard', () => {
    const seen = 'You read both words, and I heard "Πάντοτε χαίρετε" in a steady voice. Listen again to the first sound of each word and try once more.';
    expect(checkExpect(noteCheck(found!.example), noteAnswer(seen))).not.toEqual([]);
  });

  it('refuses any note that quotes either word in Greek letters as heard, with or without "you read"', () => {
    for (const note of ['I heard "Πάντοτε" and then "χαίρετε".', 'I heard "χαίρετε" in a steady voice.', 'Both words were clear: Πάντοτε χαίρετε.']) {
      expect(checkExpect(noteCheck(found!.example), noteAnswer(note)), note).not.toEqual([]);
    }
  });

  it('accepts a note that says what was heard in plain letters', () => {
    const heard = 'You said both words. I heard "antote" for the first word, so start with the p; the second came out as "serede".';
    expect(checkExpect(noteCheck(found!.example), noteAnswer(heard))).toEqual([]);
  });
});

describe('no scenario note, and no instructions, use the past tense of read', () => {
  const PAST_READ = /\byou(?:'ve| have)? read\b/i;
  // The one place the instructions may write the phrase is a line that begins "Wrong:", where it is named as what the note must not say.
  const withoutWrongLines = (text: string) => text.split('\n').filter((line) => !/^\s*Wrong:/.test(line)).join('\n');

  it('has no "You read" or "you\'ve read" anywhere in a verse-read scenario file', () => {
    for (const f of exampleFiles) expect(readFileSync(`${DIR}/${f}`, 'utf8'), f).not.toMatch(PAST_READ);
  });

  // bible-talk's own text has present-tense lines ("the texts you read") and a settings list written from the registry, so there the
  // section is checked; verse-read's whole file is.
  it('verse-read\'s instructions write none anywhere', () => {
    expect(withoutWrongLines(instructionsOf('verse-read'))).not.toMatch(PAST_READ);
  });

  it.each(['verse-read', 'verse-ask', 'bible-talk'])('the %s instructions have a section on words the voice can misread', (kind) => {
    const text = instructionsOf(kind);
    const start = text.indexOf('## Words the voice can misread');
    expect(start, 'the section').toBeGreaterThanOrEqual(0);
    const section = text.slice(start, text.indexOf('\n## ', start + 1));
    expect(withoutWrongLines(section)).not.toMatch(PAST_READ);
    expect(section).toMatch(/past tense of read/);
    for (const word of ['lead', 'live', 'wind', 'tear', 'close', 'present']) expect(section, word).toContain(`\`${word}\``);
  });
});

describe('the verse-read instructions forbid "you read" in any tense (mw-5r3p30.774)', () => {
  const text = instructionsOf('verse-read');
  const start = text.indexOf('## Words the voice can misread');
  const section = text.slice(start, text.indexOf('\n## ', start + 1)).replace(/\s+/g, ' ');

  it('says never "read" right after "you", present tense too, and the voice cannot tell the tense', () => {
    expect(section).toMatch(/Never "read" right after "you", in any tense/);
    expect(section).toMatch(/cannot tell/);
  });

  it('shows the wrong sentence the mill produced and the ways to say it right', () => {
    expect(section).toMatch(/Wrong: .*when you read again/);
    for (const right of ['read it again', 'when you try again', 'hold Read']) expect(section, right).toContain(right);
  });

  it('no longer calls the present tense fine', () => {
    expect(section).not.toMatch(/present tense is fine/i);
  });
});

describe('the verse-read instructions say what was heard from the produced sounds', () => {
  const text = instructionsOf('verse-read');

  it('tells the model never to quote the target as heard, and to name what it heard from produced_phonemes in plain letters', () => {
    expect(text).toContain('## What you heard');
    expect(text).toContain('produced_phonemes');
    expect(text).toMatch(/never quote `target_text`/i);
    expect(text).toMatch(/plain Latin letters/);
  });
});

describe('the woven-reading rules keep Greek letters out of the note (mw-5r3p30.739)', () => {
  const text = instructionsOf('verse-read');
  const start = text.indexOf('## A woven reading');
  const section = text.slice(start, text.indexOf('\n## ', start + 1));

  it('says the note never writes a Greek letter, and names a Greek word by its respelling or its place', () => {
    expect(start, 'the section').toBeGreaterThanOrEqual(0);
    expect(section).toMatch(/`note` never writes a Greek letter/);
    expect(section).toMatch(/respelling/);
    expect(section).toMatch(/the first word/);
  });

  it('leaves the Greek to focus_words', () => {
    expect(section).toMatch(/`focus_words` keep the Greek/);
  });
});
