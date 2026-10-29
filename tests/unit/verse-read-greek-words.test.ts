// mw-5r3p30.659: the reading check on a verse read in Greek sends the verse's Greek words with the app's respelling, syllables and stress (greek_words, from the
// one builder, src/services/greekWords.ts, as the Bible talk and Ask the tutor send it), so a tip on σβέννυτε is cut and stressed from the app's data, never guessed.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Chapter } from '../../src/data/chapter';
import { greekWordsFitting } from '../../src/services/greekWords';
import { buildReadingRequest } from '../../src/services/reading';
import { MAX_REQUEST_BYTES } from '../../src/services/requestBudget';
import { DEFAULT_PRONUNCIATION } from '../../src/speech/pronunciation';
import { validate, type Schema } from '../support/schema-validate';
import '../support/grinds-in-graph';

const thess = JSON.parse(readFileSync('public/data/1th/5.json', 'utf8')) as Chapter;
const verse19 = thess.verses.find((v) => v.n === 19);
if (!verse19) throw new Error('no verse 19');
const size = (r: unknown) => new TextEncoder().encode(JSON.stringify(r)).length;
const greekRead = () => buildReadingRequest('1 Thessalonians 5:19', verse19, 'greek', 'el', undefined, undefined, undefined, DEFAULT_PRONUNCIATION, undefined, thess);

describe('verse-read greek_words', () => {
  it('hands the grind σβέννυτε\'s syllables, stress and respelling when the verse is read in Greek', () => {
    expect(greekRead().greek_words?.find((w) => w.form === 'σβέννυτε')).toEqual({
      form: 'σβέννυτε',
      lemma: 'σβέννυμι',
      gloss: expect.any(String),
      parse: 'verb, present active imperative, 2nd person plural',
      respelling: 'ZVE-nee-te',
      syllables: ['σβέν', 'νυ', 'τε'],
      stress: 0,
    });
  });

  it('is the very list the shared builder gives for the verse and the rest of the request', () => {
    const request = greekRead();
    const rest = { ...request, greek_words: undefined };
    expect(request.greek_words).toEqual(greekWordsFitting(thess, [verse19], '', DEFAULT_PRONUNCIATION, size(rest)));
  });

  it('keeps the request within the grist', () => {
    expect(size(greekRead())).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
  });

  it('sends the words with no chapter data too: syllables and stress, and no gloss or parse', () => {
    const r = buildReadingRequest('1 Thessalonians 5:19', verse19, 'greek', 'el');
    expect(r.greek_words?.find((w) => w.form === 'σβέννυτε')).toMatchObject({ lemma: 'σβέννυμι', gloss: '', parse: '', syllables: ['σβέν', 'νυ', 'τε'], stress: 0 });
  });

  it('sends none when the verse is read in English: the text he reads has no Greek in it', () => {
    expect(buildReadingRequest('1 Thessalonians 5:19', verse19, 'english', 'en', undefined, undefined, undefined, DEFAULT_PRONUNCIATION, undefined, thess)).not.toHaveProperty('greek_words');
  });

  it('fits the input schema', () => {
    const schema = JSON.parse(readFileSync('grinds/verse-read.input.schema.json', 'utf8')) as Schema;
    expect(validate(greekRead(), schema)).toEqual([]);
  });
});
