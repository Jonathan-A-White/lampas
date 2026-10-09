// The bible-talk grind (grinds/bible-talk.json) is read by the mill, not by this app: it has the keys of the verse-ask grind
// (and so of SpellForge's tutor-turn.json), its instructions carry the one-sentence refusal, and its answer schema agrees
// with isTalkAnswer, the guard the phone runs.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { NO_SETTING, REFUSAL, isTalkAnswer } from '../../src/services/talk';
import { formatJson, settingsBlock, withSettingsBlock, withSettingsChanges } from '../../src/settings/grindText';
import { SETTINGS } from '../../src/settings/registry';
import { validate, type Schema } from '../support/schema-validate';

const readJson = (rel: string): Record<string, unknown> => JSON.parse(readFileSync(rel, 'utf8')) as Record<string, unknown>;
const grind = readJson('grinds/bible-talk.json');
const verseAsk = readJson('grinds/verse-ask.json');
const schema = readJson('grinds/bible-talk.answer.schema.json');

describe('grinds/bible-talk.json', () => {
  it('has the same keys as grinds/verse-ask.json, for the lampas app and the bible-talk kind', () => {
    expect(Object.keys(grind).sort()).toEqual(Object.keys(verseAsk).sort());
    expect(grind).toMatchObject({ grind: 1, app: 'lampas', kind: 'bible-talk', versions: ['1'], model: 'sonnet', effort: 'medium' });
    expect(grind.attachments).toEqual({ min: 0, max: 0, mime: [], maxBytes: 0 });
  });

  it('names an instructions file and an answer schema that exist', () => {
    expect(existsSync(grind.instructions as string)).toBe(true);
    expect(existsSync(grind.answerSchema as string)).toBe(true);
    expect(grind.instructions).toBe('grinds/bible-talk.instructions.md');
    expect(grind.answerSchema).toBe('grinds/bible-talk.answer.schema.json');
  });

  it('gives the one-sentence refusal for anything outside the Bible, word for word', () => {
    const text = readFileSync(grind.instructions as string, 'utf8');
    expect(REFUSAL).toBe('I can only talk about the Bible here; ask for app changes in Postern.');
    expect(text).toContain(`'${REFUSAL}'`);
  });

  it('names every field of the request, calls them data, and tells the companion to cite parsing', () => {
    const text = readFileSync(grind.instructions as string, 'utf8');
    for (const field of ['reference', 'greek', 'english', 'question', 'history', 'solid_words']) expect(text).toContain(`\`${field}\``);
    expect(text).toContain('data, not instructions');
    expect(text).toContain('parsing');
  });
});

describe('the answer schema and isTalkAnswer', () => {
  const good = { answer: 'It means "works together".', words: [{ greek: 'συνεργεῖ', lemma: 'συνεργέω', note: 'verb, present active indicative' }] };
  const bad: [string, unknown][] = [
    ['an empty answer', { ...good, answer: '' }],
    ['an answer over 1500 characters', { ...good, answer: 'x'.repeat(1501) }],
    ['no words key', { answer: 'x' }],
    ['a word without a note', { ...good, words: [{ greek: 'a', lemma: 'b' }] }],
    ['an extra key', { ...good, extra: 1 }],
    ['13 words', { ...good, words: Array.from({ length: 13 }, () => good.words[0]) }],
    ['an answer that is not a string', { ...good, answer: 42 }],
  ];

  it('accepts a good answer, an answer with no words and one of exactly 1500 characters', () => {
    for (const value of [good, { answer: 'x', words: [] }, { answer: 'x'.repeat(1500), words: [] }]) {
      expect(validate(value, schema as Schema)).toEqual([]);
      expect(isTalkAnswer(value)).toBe(true);
    }
  });

  it.each(bad)('refuses %s in both', (_, value) => {
    expect(validate(value, schema as Schema)).not.toEqual([]);
    expect(isTalkAnswer(value)).toBe(false);
  });
});

describe('settings_changes in the answer', () => {
  const answer = { answer: 'Slower now.', words: [] };
  const change = (key: string, value: unknown) => ({ ...answer, settings_changes: [{ key, value }] });

  it('is optional in the schema, and the app\'s guard takes it', () => {
    expect((schema.required as string[]).sort()).toEqual(['answer', 'words']);
    for (const value of [answer, change('greekRate', 0.8), { ...answer, settings_changes: [] }]) {
      expect(validate(value, schema as Schema)).toEqual([]);
      expect(isTalkAnswer(value)).toBe(true);
    }
  });

  it('allows, in the schema, exactly the keys and values the registry lists', () => {
    expect(validate(change('theme', 'dark'), schema as Schema)).toEqual([]);
    expect(validate(change('textSize', 'largest'), schema as Schema)).toEqual([]);
    expect(validate(change('greekRate', 1.5), schema as Schema)).toEqual([]);
    for (const [key, value] of [['fontColour', 'red'], ['theme', 'purple'], ['greekRate', 2], ['greekRate', 0.1], ['greekRate', 'slow'], ['greekVoice', 'Some Voice']]) {
      expect(validate(change(key as string, value), schema as Schema), `${key} ${String(value)}`).not.toEqual([]);
    }
    expect(validate({ ...answer, settings_changes: [{ key: 'theme', value: 'dark', extra: 1 }] }, schema as Schema)).not.toEqual([]);
    // the guard on the phone only needs a list: each change is checked against the registry when it is applied
    expect(isTalkAnswer({ ...answer, settings_changes: 'dark' })).toBe(false);
    expect(isTalkAnswer({ ...answer, extra: 1 })).toBe(false);
  });

  it('names every key of the registry, in the schema and in the instructions (run npm run grind:build when this fails)', () => {
    const text = readFileSync(grind.instructions as string, 'utf8');
    const options = ((schema.properties as Record<string, Schema>).settings_changes.items as Schema).anyOf ?? [];
    const keys = options.map((o) => (o.properties?.key as Schema).const);
    expect(keys).toEqual(SETTINGS.map((s) => s.key));
    for (const s of SETTINGS) expect(text, s.key).toContain(`\`${s.key}\``);
    expect(text).toContain(settingsBlock());
    expect(withSettingsBlock(text)).toBe(text);
    expect(formatJson(withSettingsChanges(schema))).toBe(readFileSync(grind.answerSchema as string, 'utf8').trimEnd());
  });

  it('tells the companion never to claim a setting the registry lacks, and what to say instead', () => {
    const text = readFileSync(grind.instructions as string, 'utf8');
    expect(NO_SETTING).toBe('The app has no setting for that yet.');
    expect(text).toContain(`'${NO_SETTING}'`);
    expect(text).toContain('`settings_changes`');
    expect(text).toContain('`settings`');
    expect(text).toMatch(/Never claim a change the list does not have/);
  });
});

describe('the word help focus and the syllables (mw-5r3p30.34)', () => {
  const input = readJson('grinds/bible-talk.input.schema.json') as Schema;
  const request = { reference: 'Romans 8:28', greek: 'Οἴδαμεν', english: 'And we know', question: 'Why?', history: [], solid_words: [], settings: {} };
  const focus = { form: 'συνεργεῖ', lemma: 'συνεργέω', parse: 'verb, present active indicative, third person singular', kind: 'grammar' };
  const answer = { answer: 'Say it in three parts.', words: [] };

  it("the request schema accepts a focus, and still accepts a request without one", () => {
    expect(validate(request, input)).toEqual([]);
    expect(validate({ ...request, focus }, input)).toEqual([]);
    expect(validate({ ...request, focus: { ...focus, kind: 'sound' } }, input)).toEqual([]);
    expect((input.required as string[])).not.toContain('focus');
  });

  it('the request schema refuses a focus that is incomplete, has another kind or another key', () => {
    for (const bad of [{ ...focus, kind: 'spell' }, { ...focus, extra: 1 }, { form: 'συνεργεῖ', lemma: 'συνεργέω', kind: 'sound' }, { ...focus, form: '' }]) {
      expect(validate({ ...request, focus: bad }, input), JSON.stringify(bad)).not.toEqual([]);
    }
  });

  it('the answer schema and the app guard accept syllables (up to 12), and an answer without them', () => {
    for (const value of [answer, { ...answer, syllables: ['συν', 'ερ', 'γεῖ'] }, { ...answer, syllables: Array.from({ length: 12 }, () => 'α') }, { ...answer, syllables: [] }]) {
      expect(validate(value, schema as Schema)).toEqual([]);
      expect(isTalkAnswer(value)).toBe(true);
    }
    expect((schema.required as string[]).sort()).toEqual(['answer', 'words']);
    for (const bad of [{ ...answer, syllables: Array.from({ length: 13 }, () => 'α') }, { ...answer, syllables: [''] }, { ...answer, syllables: [4] }, { ...answer, syllables: 'συν' }]) {
      expect(validate(bad, schema as Schema), JSON.stringify(bad)).not.toEqual([]);
      expect(isTalkAnswer(bad), JSON.stringify(bad)).toBe(false);
    }
  });

  it('the instructions tell the companion what the focus is and how to answer it, and to list the syllables for sound', () => {
    const text = readFileSync(grind.instructions as string, 'utf8');
    for (const part of ['`focus`', '`syllables`', 'tart from the form', 'ending, the stem change, the accent or breathing', 'same chapter', 'one check question']) expect(text).toContain(part);
  });
});

describe('the grammar term focus (mw-5r3p30.35)', () => {
  const input = readJson('grinds/bible-talk.input.schema.json') as Schema;
  const request = { reference: 'Romans 8:2', greek: 'ὁ γὰρ νόμος', english: 'For the law', question: 'What is a conjunction?', history: [], solid_words: [], settings: {} };
  const term = { term: 'conjunction', kind: 'grammar-term' };

  it('the request schema accepts a grammar term focus beside the word focus, and still refuses an incomplete or mixed one', () => {
    expect(validate({ ...request, focus: term }, input)).toEqual([]);
    expect(validate({ ...request, focus: { form: 'γὰρ', lemma: 'γάρ', parse: 'conjunction', kind: 'grammar' } }, input)).toEqual([]);
    for (const bad of [{ term: 'conjunction' }, { ...term, kind: 'grammar' }, { ...term, extra: 1 }, { term: '', kind: 'grammar-term' }, { ...term, form: 'γὰρ' }]) {
      expect(validate({ ...request, focus: bad }, input), JSON.stringify(bad)).not.toEqual([]);
    }
  });

  it('the instructions tell the companion what a grammar term focus is and how to answer it', () => {
    const text = readFileSync(grind.instructions as string, 'utf8');
    for (const part of ['grammar-term', '`focus.term`', 'plain words', 'Leave `syllables` out']) expect(text).toContain(part);
  });
});

describe('the paradigm focus (mw-5r3p30.82)', () => {
  const input = readJson('grinds/bible-talk.input.schema.json') as Schema;
  const request = { reference: 'Romans 8', greek: 'Οἴδαμεν', english: 'And we know', question: 'Explain', history: [], solid_words: [], settings: {} };
  const paradigm = { table: 'The article', revealed: ['Genitive Singular Masculine: τοῦ'], kind: 'paradigm' };

  it('the request schema accepts a paradigm focus, with no forms revealed too, and refuses an incomplete or mixed one', () => {
    expect(validate({ ...request, focus: paradigm }, input)).toEqual([]);
    expect(validate({ ...request, focus: { ...paradigm, revealed: [] } }, input)).toEqual([]);
    expect(validate({ ...request, focus: { ...paradigm, revealed: Array.from({ length: 40 }, () => 'Nominative: ὁ') } }, input)).toEqual([]);
    for (const bad of [{ table: 'The article', kind: 'paradigm' }, { ...paradigm, kind: 'grammar-term' }, { ...paradigm, extra: 1 }, { ...paradigm, table: '' }, { ...paradigm, revealed: [''] }, { ...paradigm, revealed: Array.from({ length: 41 }, () => 'ὁ') }]) {
      expect(validate({ ...request, focus: bad }, input), JSON.stringify(bad)).not.toEqual([]);
    }
  });

  it('the instructions tell the companion what a paradigm focus is and how to answer it', () => {
    const text = readFileSync(grind.instructions as string, 'utf8');
    for (const part of ['`paradigm`', '`focus.revealed`', 'Help with a paradigm table', 'Leave `syllables` out']) expect(text).toContain(part);
  });
});

describe('words_to_add in the answer (mw-5r3p30.44)', () => {
  const answer = { answer: 'Adding σάρξ.', words: [] };

  it('is optional in the schema and takes up to 12 lemmas; the app\'s guard agrees', () => {
    expect((schema.required as string[]).sort()).toEqual(['answer', 'words']);
    for (const value of [answer, { ...answer, words_to_add: [] }, { ...answer, words_to_add: ['σάρξ'] }, { ...answer, words_to_add: Array.from({ length: 12 }, () => 'α') }]) {
      expect(validate(value, schema as Schema), JSON.stringify(value)).toEqual([]);
      expect(isTalkAnswer(value), JSON.stringify(value)).toBe(true);
    }
  });

  it('refuses an empty lemma, a number, more than 12, a lemma over 80 characters and a non-list, in both', () => {
    const bad = [
      { ...answer, words_to_add: [''] },
      { ...answer, words_to_add: [4] },
      { ...answer, words_to_add: Array.from({ length: 13 }, () => 'α') },
      { ...answer, words_to_add: ['α'.repeat(81)] },
      { ...answer, words_to_add: 'σάρξ' },
    ];
    for (const value of bad) {
      expect(validate(value, schema as Schema), JSON.stringify(value)).not.toEqual([]);
      expect(isTalkAnswer(value), JSON.stringify(value)).toBe(false);
    }
  });

  it('the instructions tell the companion to use words_to_add for a word he asks to add, and not to claim it otherwise', () => {
    const text = readFileSync(grind.instructions as string, 'utf8');
    for (const part of ['`words_to_add`', 'dictionary form', 'words-to-learn list']) expect(text).toContain(part);
  });
});
