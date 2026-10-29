// The bible-talk grind (grinds/bible-talk.json) is read by the mill, not by this app: it has the keys of SpellForge's tutor-turn.json, its instructions carry the one-sentence refusal, and its answer schema agrees
// with isTalkAnswer, the guard the phone runs.
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { learnerGrammarOf } from '../../src/data/grammar/learnerGrammar';
import { pronunciationOf } from '../../src/speech/pronunciation';
import { FEEDBACK_SUMMARY_MAX, NO_SETTING, REFUSAL, isTalkAnswer } from '../../src/services/talk';
import { formatJson, settingsBlock, withSettingsBlock, withSettingsChanges } from '../../src/settings/grindText';
import { SETTINGS } from '../../src/settings/registry';
import { lampasRegistry } from '../../src/tutor/registry';
import { TALK_PICTURE_MAX_BYTES } from '../../src/talk/pictures';
import { validate, type Schema } from '../support/schema-validate';
import { answerFragment, instructionsPart } from 'voice-kit/talks/grind';
import { KIT_END, instructionParts, instructionsOf, withKitFragment, withKitPart } from '../../scripts/grind-parts';

// vitest related follows the import graph, and the fs reads below are not in it: these imports put the grind's file, its schemas,
// its instruction parts and its scenarios in this file's graph, so the gate's `vitest related` runs this test for a change to any of them (mw-5r3p30.860).
import '../../grinds/bible-talk.json';
import '../../grinds/bible-talk.answer.schema.json';
import '../../grinds/bible-talk.input.schema.json';
import '../support/grinds-in-graph';
import.meta.glob('../../grinds/bible-talk.instructions/*.md', { eager: true, import: 'default' });
import.meta.glob('../../grinds/examples/bible-talk/*.json', { eager: true, import: 'default' });

const readJson = (rel: string): Record<string, unknown> => JSON.parse(readFileSync(rel, 'utf8')) as Record<string, unknown>;
const grind = readJson('grinds/bible-talk.json');
const schema = readJson('grinds/bible-talk.answer.schema.json');

describe('grinds/bible-talk.json', () => {
  it('has the keys of the mill\'s grind shape, for the lampas app and the bible-talk kind', () => {
    expect(Object.keys(grind).sort()).toEqual(['answerSchema', 'app', 'attachments', 'effort', 'grind', 'instructions', 'kind', 'model', 'versions']);
    expect(grind).toMatchObject({ grind: 1, app: 'lampas', kind: 'bible-talk', versions: ['1'], model: 'sonnet', effort: 'medium' });
    expect(grind.attachments).toEqual({ min: 0, max: 4, mime: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: TALK_PICTURE_MAX_BYTES });
  });

  it('names an instructions file and an answer schema that exist', () => {
    expect(existsSync(grind.instructions as string)).toBe(true);
    expect(existsSync(grind.answerSchema as string)).toBe(true);
    expect(grind.instructions).toBe('grinds/bible-talk.instructions');
    expect(grind.answerSchema).toBe('grinds/bible-talk.answer.schema.json');
  });

  it('gives the one-sentence refusal for anything outside the Bible, word for word', () => {
    const text = instructionsOf(grind.kind as string);
    expect(REFUSAL).toBe('I can only talk about the Bible here; ask for app changes in Postern.');
    expect(text).toContain(`'${REFUSAL}'`);
  });

  it('names every field of the request, calls them data, and tells the companion to cite parsing', () => {
    const text = instructionsOf(grind.kind as string);
    for (const field of ['reference', 'greek', 'english', 'question', 'history', 'solid_words']) expect(text).toContain(`\`${field}\``);
    expect(text).toContain('data, not instructions');
    expect(text).toContain('parsing');
  });
});

describe('Hebrew in the tutor', () => {
  it('has hebrewDepth among the settings it is sent and may change, and an example in its instructions for each depth', () => {
    const text = instructionsOf(grind.kind as string);
    expect(text).toContain('`settings.hebrewDepth`');
    expect(text).toContain('`hebrewDepth` — Hebrew in the tutor.');
    for (const depth of ['transliteration', 'both', 'full']) expect(text).toContain(`\`${depth}\``);
    for (const example of ['tsedeq', 'צֶדֶק tsedeq', 'צֶדֶק']) expect(text).toContain(example);
    expect(JSON.stringify(schema)).toContain('hebrewDepth');
  });

  it('has a part for a verse of the Old Testament, at most 1,400 bytes, that teaches hebrew and hebrew_words (mw-gdcyf98.29)', () => {
    const part = instructionParts(grind.kind as string).find(({ file }) => file.endsWith('245-a-verse-of-the-old-testament.md'));
    expect(part, 'part 245').toBeDefined();
    const text = part!.text;
    expect(Buffer.byteLength(text, 'utf8')).toBeLessThanOrEqual(1_400);
    expect(text.startsWith('## A verse of the Old Testament\n')).toBe(true);
    for (const needle of ['`hebrew`', '`hebrew_words`', 'TBESH', '`settings.hebrewDepth`', 'Modern Israeli', '`language`', 'quote no Greek', '`hebrew_pronunciation_guide`']) expect(text, needle).toContain(needle);
    expect(text).toMatch(/`language` `he`/);
    expect(text).toMatch(/`greek` its pointed form/);
  });

  it('no longer says Hebrew never goes in words, and says a words entry carries language (mw-gdcyf98.29)', () => {
    const text = instructionsOf(grind.kind as string);
    expect(text).not.toContain('Hebrew never goes in `words`');
    expect(text).toMatch(/`words` (entry|entries) carr(y|ies) `language`/);
  });

  it("says a word link's lemma may be a Hebrew lemma on an Old Testament chapter (mw-gdcyf98.29)", () => {
    const part = instructionParts(grind.kind as string).find(({ file }) => file.includes('/200-'));
    expect(part!.text).toMatch(/`kind` `word`, with `lemma`: [^\n]*Hebrew lemma[^\n]*TBESH headword/);
  });

  it('has the two Hebrew talk examples, a Hebrew word in words with language he, and a word link (mw-gdcyf98.29)', () => {
    type Example = { request: Record<string, unknown>; expect: Record<string, Record<string, unknown>> };
    const read = (name: string) => readJson(`grinds/examples/bible-talk/${name}.json`) as unknown as Example;
    const verse = read('hebrew-verse-talk');
    expect(verse.request.reference).toBe('Jonah 1:1');
    expect(verse.request).toHaveProperty('hebrew');
    expect(verse.request).toHaveProperty('hebrew_words');
    expect(verse.request).not.toHaveProperty('greek_words');
    expect(verse.expect['words.0.language']).toEqual({ equals: 'he' });
    expect(new RegExp(verse.expect['words.0.lemma'].matches as string).test('דָּבָר')).toBe(true);
    expect(verse.expect['links.0.kind']).toEqual({ equals: 'word' });
    const chapter = read('hebrew-chapter-talk');
    expect(String(chapter.request.reference)).toMatch(/^Genesis 1/);
    expect(chapter.request).toHaveProperty('hebrew');
    expect(chapter.request).toHaveProperty('hebrew_words');
    const offer = read('hebrew-offer-on-genesis');
    expect(offer.request).not.toHaveProperty('hebrew');
    expect(String(offer.request.greek ?? '')).not.toMatch(/[֐-׿]/);
  });
});

describe('the answer schema and isTalkAnswer', () => {
  const good = { answer: 'It means "works together".', question: 'What does it say?', words: [{ greek: 'συνεργεῖ', lemma: 'συνεργέω', note: 'verb, present active indicative' }] };
  const bad: [string, unknown][] = [
    ['an empty answer', { ...good, answer: '' }],
    ['an answer over 1500 characters', { ...good, answer: 'x'.repeat(1501) }],
    ['no words key', { answer: 'x', question: 'Why?' }],
    ['a word without a note', { ...good, words: [{ greek: 'a', lemma: 'b' }] }],
    ['an extra key', { ...good, extra: 1 }],
    ['13 words', { ...good, words: Array.from({ length: 13 }, () => good.words[0]) }],
    ['an answer that is not a string', { ...good, answer: 42 }],
  ];

  it('accepts a good answer, an answer with no words and one of exactly 1500 characters', () => {
    for (const value of [good, { answer: 'x', question: 'What does it say?', words: [] }, { answer: 'x'.repeat(1500), question: 'What does it say?', words: [] }]) {
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
  const answer = { answer: 'Slower now.', question: 'What does it say?', words: [] };
  const change = (key: string, value: unknown) => ({ ...answer, settings_changes: [{ key, value }] });

  it('is optional in the schema, and the app\'s guard takes it', () => {
    expect((schema.required as string[]).sort()).toEqual(['answer', 'question', 'words']);
    for (const value of [answer, change('greekRate', 0.8)]) {
      expect(validate(value, schema as Schema)).toEqual([]);
      expect(isTalkAnswer(value)).toBe(true);
    }
    // mw-5r3p30.691: the only way to say "no change" is to leave it out; the guard on the phone still shrugs at [] from an older mill
    expect(validate({ ...answer, settings_changes: [] }, schema as Schema)).not.toEqual([]);
    expect(isTalkAnswer({ ...answer, settings_changes: [] })).toBe(true);
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
    const text = instructionsOf(grind.kind as string);
    const options = ((schema.properties as Record<string, Schema>).settings_changes.items as Schema).anyOf ?? [];
    const keys = options.map((o) => (o.properties?.key as Schema).const);
    expect(keys).toEqual(SETTINGS.map((s) => s.key));
    for (const s of SETTINGS) expect(text, s.key).toContain(`\`${s.key}\``);
    expect(text).toContain(settingsBlock());
    expect(withSettingsBlock(text)).toBe(text);
    expect(formatJson(withSettingsChanges(schema))).toBe(readFileSync(grind.answerSchema as string, 'utf8').trimEnd());
  });

  it('tells the companion, in the instructions and in the schema, to change a setting only when he asks', () => {
    const text = instructionsOf(grind.kind as string);
    expect(text).toMatch(/Change a setting only when he asks for it in words, never on your own/);
    expect(text).toMatch(/stop\s+reading answers aloud/);
    const described = ((schema.properties as Record<string, Record<string, unknown>>).settings_changes.description as string);
    expect(described).toMatch(/Only when he asked for the change in words, never on your own/);
  });

  it('tells the companion never to claim a setting the registry lacks, and what to say instead', () => {
    const text = instructionsOf(grind.kind as string);
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
  const answer = { answer: 'Say it in three parts.', question: 'What does it say?', words: [] };

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
    for (const value of [answer, { ...answer, syllables: ['συν', 'ερ', 'γεῖ'] }, { ...answer, syllables: Array.from({ length: 12 }, () => 'α') }]) {
      expect(validate(value, schema as Schema)).toEqual([]);
      expect(isTalkAnswer(value)).toBe(true);
    }
    expect((schema.required as string[]).sort()).toEqual(['answer', 'question', 'words']);
    for (const bad of [{ ...answer, syllables: Array.from({ length: 13 }, () => 'α') }, { ...answer, syllables: [''] }, { ...answer, syllables: [4] }, { ...answer, syllables: 'συν' }]) {
      expect(validate(bad, schema as Schema), JSON.stringify(bad)).not.toEqual([]);
      expect(isTalkAnswer(bad), JSON.stringify(bad)).toBe(false);
    }
    // mw-5r3p30.691: the schema leaves "no syllables" one way to say, leaving it out; the phone's guard still takes [] from an older mill
    expect(validate({ ...answer, syllables: [] }, schema as Schema)).not.toEqual([]);
    expect(isTalkAnswer({ ...answer, syllables: [] })).toBe(true);
  });

  it('the instructions tell the companion what the focus is and how to answer it, and to list the syllables for sound', () => {
    const text = instructionsOf(grind.kind as string);
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
    const text = instructionsOf(grind.kind as string);
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
    // mw-irpgqi.3: the mode, the cell he is on and the word he came from
    const where = { mode: 'drill', cell: { parse: 'Genitive Singular Feminine', form: 'τῆς' }, word: { form: 'ἀγαπῶ', parse: 'present active indicative, 1st person singular' } };
    expect(validate({ ...request, focus: { ...paradigm, ...where } }, input)).toEqual([]);
    expect(validate({ ...request, focus: { ...paradigm, mode: 'learn', cell: { parse: 'Genitive Singular Feminine' } } }, input)).toEqual([]);
    for (const bad of [{ mode: 'study' }, { cell: { form: 'τῆς' } }, { cell: { parse: '' } }, { cell: { parse: 'x', extra: 1 } }, { word: { form: 'ἀγαπῶ' } }, { word: { parse: 'x' } }]) {
      expect(validate({ ...request, focus: { ...paradigm, ...bad } }, input), JSON.stringify(bad)).not.toEqual([]);
    }
    for (const bad of [{ table: 'The article', kind: 'paradigm' }, { ...paradigm, kind: 'grammar-term' }, { ...paradigm, extra: 1 }, { ...paradigm, table: '' }, { ...paradigm, revealed: [''] }, { ...paradigm, revealed: Array.from({ length: 41 }, () => 'ὁ') }]) {
      expect(validate({ ...request, focus: bad }, input), JSON.stringify(bad)).not.toEqual([]);
    }
  });

  it('the instructions tell the companion what a paradigm focus is and how to answer it', () => {
    const text = instructionsOf(grind.kind as string);
    for (const part of ['`paradigm`', '`focus.revealed`', 'Help with a paradigm table', 'Leave `syllables` out', '`mode`', '`cell`', 'Word he came from']) expect(text).toContain(part);
  });
});

describe('words_to_add in the answer (mw-5r3p30.44)', () => {
  const answer = { answer: 'Adding σάρξ.', question: 'What does it say?', words: [] };

  it('is optional in the schema and takes up to 12 lemmas; the app\'s guard agrees', () => {
    expect((schema.required as string[]).sort()).toEqual(['answer', 'question', 'words']);
    for (const value of [answer, { ...answer, words_to_add: ['σάρξ'] }, { ...answer, words_to_add: Array.from({ length: 12 }, () => 'α') }]) {
      expect(validate(value, schema as Schema), JSON.stringify(value)).toEqual([]);
      expect(isTalkAnswer(value), JSON.stringify(value)).toBe(true);
    }
    // mw-5r3p30.691: leaving it out is the only way to add nothing
    expect(validate({ ...answer, words_to_add: [] }, schema as Schema)).not.toEqual([]);
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
    const text = instructionsOf(grind.kind as string);
    for (const part of ['`words_to_add`', 'dictionary form', 'words-to-learn list']) expect(text).toContain(part);
  });
});

describe('learner_grammar in the request (mw-hqd5bz.12)', () => {
  const input = readJson('grinds/bible-talk.input.schema.json') as Schema;
  const request = { reference: 'Romans 8', greek: 'Οἴδαμεν', english: 'And we know', question: 'Explain', history: [], solid_words: [], settings: {} };
  const field = learnerGrammarOf({
    goal: 'Read 1 John 1:1',
    words: { solid: 3, frontier: 2, notYet: 9 },
    ideas: [{ id: 'case-genitive', title: 'The genitive case', level: 'frontier' }],
    placed: true,
    move: 'up',
    pickerLevel: 'solid',
    approach: { name: 'Lampas ladder', credit: null, nextLesson: 'The nominative' },
  });

  it('the request schema takes the field the app builds, with no goal or no next lesson too, and does not require it', () => {
    expect((input.required as string[])).not.toContain('learner_grammar');
    expect(validate(request, input)).toEqual([]);
    expect(validate({ ...request, learner_grammar: field }, input)).toEqual([]);
    expect(validate({ ...request, learner_grammar: { ...field, goal: null, approach: { ...field.approach, credit: null, next_lesson: null } } }, input)).toEqual([]);
  });

  it('the request schema refuses a field with another key, another move or more than 12 titles', () => {
    const twelve = Array.from({ length: 13 }, () => 'x');
    for (const bad of [{ ...field, extra: 1 }, { ...field, suggested_move: 'sideways' }, { ...field, ideas: { ...field.ideas, solid: twelve } }, { ...field, picker_level: 'any' }, { ...field, placed: 'yes' }]) {
      expect(validate({ ...request, learner_grammar: bad }, input), JSON.stringify(bad)).not.toEqual([]);
    }
  });
});

describe('learner_grammar.weak in the request (mw-i7xe0n.2)', () => {
  const input = readJson('grinds/bible-talk.input.schema.json') as Schema;
  const request = { reference: 'Romans 8', greek: 'Οἴδαμεν', english: 'And we know', question: 'Explain', history: [], solid_words: [], settings: {} };
  const field = learnerGrammarOf({
    goal: null,
    words: { solid: 0, frontier: 0, notYet: 0 },
    ideas: [],
    placed: false,
    move: 'none',
    pickerLevel: 'frontier',
    approach: { name: 'Lampas ladder', credit: null, nextLesson: null },
    weak: [{ title: 'The genitive case', at: 1, labels: ['its ending', 'ν (Nu)'] }],
  });

  it('takes the weak points the app builds, and the field without them', () => {
    expect(field.weak).toEqual({ 'The genitive case': ['its ending', 'ν (Nu)'] });
    expect(validate({ ...request, learner_grammar: field }, input)).toEqual([]);
    const without = { ...field };
    delete without.weak;
    expect(validate({ ...request, learner_grammar: without }, input)).toEqual([]);
    expect((input.properties as Record<string, Schema>).learner_grammar.required).not.toContain('weak');
  });

  it('refuses a weak entry that is not a short list of short labels', () => {
    for (const bad of [{ x: 'its ending' }, { x: [] }, { x: ['a', 'b', 'c', 'd'] }, { x: [1] }, { x: ['y'.repeat(33)] }]) {
      expect(validate({ ...request, learner_grammar: { ...field, weak: bad } }, input), JSON.stringify(bad)).not.toEqual([]);
    }
  });

  it('the instructions name the field, as his weak points from Drill it, for every grind sent learner_grammar', () => {
    for (const kind of ['bible-talk', 'verse-read', 'tips']) {
      const text = instructionsOf(kind);
      expect(text, kind).toMatch(/`weak`/);
      expect(text, kind).toContain('Drill it');
    }
  });
});

describe('the word and quiz focus (mw-5r3p30.80)', () => {
  const input = readJson('grinds/bible-talk.input.schema.json') as Schema;
  const request = { reference: 'Romans 8:2', greek: 'Ὁ γὰρ νόμος', english: 'For the law', question: 'Tell me', history: [], solid_words: [], settings: {} };
  const word = { form: 'νόμος', lemma: 'νόμος', parse: 'noun, nominative singular masculine', kind: 'word' };
  const quiz = {
    kind: 'quiz',
    lemma: 'νόμος',
    form: 'νόμος',
    parse: 'noun, nominative singular masculine',
    strongs: 'G3551',
    pos: 'noun',
    question: 'What does νόμος mean?',
    choices: ['law', 'sin', 'spirit', 'flesh'],
    picked: 'sin',
    correct: 'law',
    right: false,
    answers: [{ lemma: 'ἀγαπάω', picked: 'to love', right: true }],
  };

  it('the request schema accepts the word kind and a quiz focus, with only what the app knows of the word', () => {
    expect(validate({ ...request, focus: word }, input)).toEqual([]);
    expect(validate({ ...request, focus: quiz }, input)).toEqual([]);
    const bare: Record<string, unknown> = { ...quiz, answers: [] };
    for (const key of ['form', 'parse', 'strongs', 'pos']) delete bare[key];
    expect(validate({ ...request, focus: bare }, input)).toEqual([]);
  });

  it('the request schema refuses a quiz focus that is incomplete, mixed or too big', () => {
    const noAnswers: Record<string, unknown> = { ...quiz };
    delete noAnswers.answers;
    const many = Array.from({ length: 11 }, () => ({ lemma: 'α', picked: 'a', right: true }));
    for (const bad of [noAnswers, { ...quiz, extra: 1 }, { ...quiz, right: 'no' }, { ...quiz, picked: '' }, { ...quiz, answers: many }, { ...quiz, answers: [{ lemma: 'α', picked: 'a' }] }, { ...quiz, choices: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }]) {
      expect(validate({ ...request, focus: bad }, input), JSON.stringify(bad)).not.toEqual([]);
    }
  });

  it('the instructions tell the companion to open with what it was handed, for a word and for a quiz question', () => {
    const text = instructionsOf(grind.kind as string);
    for (const part of ['`kind` is `word`', 'Help with a Quick test question', '`focus.kind` is `quiz`', 'About νόμος (G3551), noun, and', '`focus.answers`', 'what you were handed']) expect(text).toContain(part);
  });
});

describe('quiz mode on an Old Testament verse (mw-gdcyf98.30)', () => {
  const part = instructionParts(grind.kind as string).find(({ file }) => file.endsWith('170-quiz-mode.md'))?.text.replace(/\s+/g, ' ') ?? '';
  const input = readJson('grinds/bible-talk.input.schema.json') as Schema;

  it('tells the tutor the text of an Old Testament verse is `hebrew` and `english`, and the quiz asks in its words, never in Greek', () => {
    expect(part).toContain('The text is only the text in `greek` and `english` (`hebrew` and `english` on an Old Testament verse)');
    expect(part).toMatch(/Old Testament verse the request carries `hebrew` \(and `hebrew_words`\) instead of `greek`/);
    expect(part).toMatch(/words and forms of `hebrew`, pitched at his Hebrew \(`settings\.hebrewDepth`\), and never quotes Greek/);
    expect(part).toMatch(/Learning Greek or Hebrew/);
  });

  it('has the hebrew-quiz example: Jonah 1:1 in quiz mode, Hebrew and its words, no Greek, which the request schema accepts', () => {
    const example = readJson('grinds/examples/bible-talk/hebrew-quiz.json') as { request: Record<string, unknown> };
    expect(example.request).toMatchObject({ reference: 'Jonah 1:1', mode: 'quiz', quiz_goal: 'learning Hebrew' });
    expect(example.request.hebrew).toBeTruthy();
    expect(example.request.hebrew_words).toBeInstanceOf(Array);
    expect(example.request).not.toHaveProperty('greek');
    expect(validate(example.request, input)).toEqual([]);
  });
});

describe('the screen field (mw-5r3p30.91)', () => {
  const input = readJson('grinds/bible-talk.input.schema.json') as Schema;
  const base = { reference: 'Goal', question: 'Where am I?', history: [], solid_words: [], settings: {} };
  const screen = {
    name: 'Goal',
    facts: [
      { label: 'Goal', value: 'Read 1 John 1:1' },
      { label: 'Words', value: 'Solid 1 · Frontier 2 · Not yet 27' },
      { label: 'Learn next', value: 'The Greek alphabet' },
      { label: 'Next words', value: 'ὅς (who), ἀπό (from), ἀρχή (beginning)' },
    ],
  };

  it('the request schema takes a screen, with no verse text, and still takes a request without one', () => {
    expect(validate({ ...base, screen }, input)).toEqual([]);
    expect(validate({ ...base, screen: { name: 'About', facts: [] } }, input)).toEqual([]);
    expect(validate({ ...base, greek: 'Οἴδαμεν', english: 'And we know' }, input)).toEqual([]);
    expect(input.required as string[]).not.toContain('screen');
    expect(input.required as string[]).not.toContain('greek');
    expect(input.required as string[]).not.toContain('english');
  });

  it('the request schema refuses a screen that is incomplete, has another key or is too big', () => {
    const many = Array.from({ length: 13 }, (_, i) => ({ label: `L${i}`, value: 'v' }));
    for (const bad of [
      { name: 'Goal' },
      { facts: [] },
      { ...screen, extra: 1 },
      { name: '', facts: [] },
      { name: 'Goal', facts: [{ label: 'Goal' }] },
      { name: 'Goal', facts: [{ label: '', value: 'x' }] },
      { name: 'Goal', facts: [{ label: 'Goal', value: 'x', extra: 1 }] },
      { name: 'Goal', facts: many },
      { name: 'Goal', facts: [{ label: 'Goal', value: 'x'.repeat(401) }] },
    ]) {
      expect(validate({ ...base, screen: bad }, input), JSON.stringify(bad)).not.toEqual([]);
    }
  });

  it('the instructions say how to use `screen`, that a verse it suggests comes as a verse link, and that the screen is not a text', () => {
    const text = instructionsOf(grind.kind as string);
    for (const part of ['`screen`', '## Talk from a screen', '`facts`', '`kind` `verse`', 'simplest verse', 'no verse text']) expect(text).toContain(part);
  });
});

describe('the screen settings (mw-5r3p30.107)', () => {
  const input = readJson('grinds/bible-talk.input.schema.json') as Schema;
  const base = { reference: 'Settings', question: "What's the benefit of Logos?", history: [], solid_words: [], settings: {} };
  const settings = [
    { name: 'Weave', value: 'Solid words', help: 'Greek words you know stand in the English.' },
    { name: 'Logos', value: 'Off', help: 'Adds Open in Logos for each lexicon in Your Logos library, and Bible Word Study.' },
  ];

  it('the request schema takes a screen with settings, each a name, a value and its help, and refuses a bad one', () => {
    expect(validate({ ...base, screen: { name: 'Settings', facts: [], settings } }, input)).toEqual([]);
    expect(validate({ ...base, screen: { name: 'Settings', facts: [] } }, input)).toEqual([]);
    const many = Array.from({ length: 71 }, (_, i) => ({ name: `S${i}`, value: 'On', help: 'h' }));
    for (const bad of [
      [{ name: 'Weave', value: 'Off' }],
      [{ name: '', value: 'Off', help: 'h' }],
      [{ name: 'Weave', value: 'Off', help: 'h', extra: 1 }],
      [{ name: 'Weave', value: 'Off', help: 'x'.repeat(101) }],
      many,
    ]) {
      expect(validate({ ...base, screen: { name: 'Settings', facts: [], settings: bad } }, input), JSON.stringify(bad)).not.toEqual([]);
    }
  });

  it('the instructions say how to answer about a setting: what it does, what on or off gains and loses, what it needs, and no invented setting', () => {
    const text = instructionsOf(grind.kind as string);
    for (const part of ['`screen.settings`', 'what it does', 'gains', 'loses', 'what it needs', 'never invent a setting']) expect(text.toLowerCase()).toContain(part.toLowerCase());
  });

  it('the instructions work "What\'s the benefit of Logos?" through: it names Logos, its Open in Logos link and the app on the phone', () => {
    const text = instructionsOf(grind.kind as string);
    const example = text.slice(text.indexOf("What's the benefit of Logos?"));
    expect(example.length).toBeGreaterThan(0);
    const worked = example.slice(0, 900);
    for (const part of ['Logos', 'Open in Logos', 'lexicon', 'app on his phone']) expect(worked).toContain(part);
  });
});

describe('the sound kind for a Hebrew word (mw-5r3p30.98)', () => {
  const input = readJson('grinds/bible-talk.input.schema.json') as Schema;
  const request = { reference: 'Romans 8:28', greek: 'Οἴδαμεν', english: 'And we know', question: 'Say it', history: [], solid_words: [], settings: {} };
  const focus = { form: 'צֶדֶק', lemma: 'צֶדֶק', parse: 'Hebrew word', kind: 'sound', language: 'he' };
  const answer = { answer: 'Say it TSE-dek.', question: 'What does it say?', words: [], syllables: ['צֶ', 'דֶק'], transliteration: ['TSE', 'dek'] };

  it('the request schema accepts a word focus in Hebrew, and refuses another language', () => {
    expect(validate({ ...request, focus }, input)).toEqual([]);
    expect(validate({ ...request, focus: { ...focus, language: 'fr' } }, input)).not.toEqual([]);
  });

  it('the answer schema and the app take Hebrew syllables with a transliteration for each, and refuse a transliteration over 12', () => {
    expect(validate(answer, schema as Schema)).toEqual([]);
    expect(isTalkAnswer(answer)).toBe(true);
    const many = { ...answer, transliteration: Array.from({ length: 13 }, () => 'a') };
    expect(validate(many, schema as Schema)).not.toEqual([]);
    expect(isTalkAnswer(many)).toBe(false);
    expect(isTalkAnswer({ ...answer, transliteration: [''] })).toBe(false);
  });

  it('tells the tutor to put Hebrew syllables in Hebrew letters and their sounds in `transliteration` when the focus language is he', () => {
    const text = instructionsOf(grind.kind as string);
    expect(text).toContain('`focus.language`');
    expect(text).toContain('`transliteration`');
    expect(text).toMatch(/Hebrew letters/);
    expect(JSON.stringify(schema)).toContain('transliteration');
  });
});

describe('the feedback offer', () => {
  const good = { answer: 'Lampas has no such link yet. I can pass it to the makers; I cannot promise they will build it.', question: 'What does it say?', words: [] };
  const instructions = instructionsOf('bible-talk');

  it('is an optional object with a one-line summary, in both the schema and isTalkAnswer', () => {
    for (const offer of [{ summary: 'He wants Lampas to work with Olive Tree.' }, { summary: 'x'.repeat(FEEDBACK_SUMMARY_MAX) }]) {
      const value = { ...good, feedback_offer: offer };
      expect(validate(value, schema as Schema)).toEqual([]);
      expect(isTalkAnswer(value)).toBe(true);
    }
    expect((schema.required as string[]).includes('feedback_offer')).toBe(false);
    const summary = ((schema.properties as Record<string, Schema>).feedback_offer.properties as Record<string, Schema>).summary;
    expect(summary.maxLength).toBe(FEEDBACK_SUMMARY_MAX);
  });

  it.each<[string, unknown]>([
    ['an empty summary', { summary: '' }],
    ['a summary over the limit', { summary: 'x'.repeat(FEEDBACK_SUMMARY_MAX + 1) }],
    ['an offer with no summary', {}],
    ['an offer with an extra key', { summary: 'x', extra: 1 }],
    ['an offer that is a string', 'x'],
  ])('refuses %s in both', (_, offer) => {
    const value = { ...good, feedback_offer: offer };
    expect(validate(value, schema as Schema)).not.toEqual([]);
    expect(isTalkAnswer(value)).toBe(false);
  });

  it('tells the grind when to offer it, never to promise the change, and that the app draws the button', () => {
    expect(instructions).toContain('## Asks the app cannot meet');
    for (const rule of ['`feedback_offer`', 'Send this to the makers', 'never promise', 'another app', 'a new setting']) expect(instructions).toContain(rule);
    expect(instructions).toContain('only when');
  });

  it('answers a question about what a screen shows or means and never takes it for a wish (mw-5r3p30.854)', () => {
    const rule = instructions.replace(/\s+/g, ' ');
    expect(rule).toContain('what a screen shows or means');
    expect(rule).toContain('never a wish');
  });

  it('offers to send an ask that would grow the app (an approach, programme, resource, text or translation) to the makers (mw-hqd5bz.37)', () => {
    for (const words of ['an approach or programme', 'a study resource', 'a text', 'a translation', 'Send this to the makers', 'Ask for more', "I'd like Lampas to have "]) {
      expect(instructions).toContain(words);
    }
  });

  it("carries the worked example 'Can I read the ESV beside the Greek?' and the offer it yields; no study app gets an offer (mw-5r3p30.745)", () => {
    expect(instructions).toContain('Can I read the ESV beside the Greek?');
    expect(instructions).not.toMatch(/olive tree/i);
    const block = /<!-- feedback-offer-example:start -->\s*```json\s*([\s\S]*?)```\s*<!-- feedback-offer-example:end -->/.exec(instructions);
    expect(block, 'the example answer block').not.toBeNull();
    const answer = JSON.parse((block as RegExpExecArray)[1]) as { feedback_offer?: { summary: string } };
    expect(answer.feedback_offer?.summary).toMatch(/ESV/);
    expect(validate(answer, schema as Schema)).toEqual([]);
    expect(isTalkAnswer(answer)).toBe(true);
    expect(JSON.stringify(answer)).not.toMatch(/\bwill (build|add|make|do)\b/i);
  });
});

describe('the screen credits (mw-vtjxh4.2)', () => {
  const input = readJson('grinds/bible-talk.input.schema.json') as Schema;
  const base = { reference: 'About', question: 'What does STEPBible give me?', history: [], solid_words: [], settings: {} };
  const credits = [
    { name: 'TBESG', use: "STEPBible (Tyndale House): each word's lemma, gloss and definition", licence: 'CC BY 4.0', link: 'https://www.stepbible.org' },
    { name: 'Majority Standard Bible', use: 'The Greek you read, aligned to its English', licence: 'Public domain', link: 'https://majoritybible.com' },
  ];

  it('the request schema takes a screen with credits, each a name, a use, a licence and a link, and refuses a bad one', () => {
    expect(validate({ ...base, screen: { name: 'About', facts: [], credits } }, input)).toEqual([]);
    expect(validate({ ...base, screen: { name: 'About', facts: [] } }, input)).toEqual([]);
    const many = Array.from({ length: 41 }, (_, i) => ({ ...credits[0], name: `C${i}` }));
    for (const bad of [
      [{ name: 'TBESG', use: 'u', licence: 'CC BY 4.0' }],
      [{ ...credits[0], name: '' }],
      [{ ...credits[0], extra: 1 }],
      [{ ...credits[0], use: 'x'.repeat(161) }],
      many,
    ]) {
      expect(validate({ ...base, screen: { name: 'About', facts: [], credits: bad } }, input), JSON.stringify(bad)).not.toEqual([]);
    }
  });

  it('the instructions say how to talk about a credit: what it is, who made it, what it gives this reader, what its licence lets us do, and why we credit', () => {
    const text = instructionsOf(grind.kind as string);
    for (const part of ['### Talk from About', '`screen.credits`', 'what it is', 'who made it', 'what it gives this reader', 'licence lets', 'standing on the shoulders', 'TBESG', 'CC BY 4.0', 'never invent a credit']) {
      expect(text).toContain(part);
    }
  });

  it('takes the results of a drill as screen.drill: every question with its idea, what was asked, his answer, the right answer and right or wrong (mw-5r3p30.649)', () => {
    const input = readJson('grinds/bible-talk.input.schema.json') as Schema;
    const example = readJson('grinds/examples/bible-talk/drill-results-wrong.json') as { request: { screen: { drill: Record<string, unknown>[] } } };
    expect(example.request.screen.drill.filter((d) => d.right === false)).toHaveLength(1);
    expect(validate(example.request, input)).toEqual([]);
    const [one] = example.request.screen.drill;
    for (const key of ['idea', 'asked', 'answer', 'right_answer', 'right']) {
      const without = Object.fromEntries(Object.entries(one).filter(([k]) => k !== key));
      expect(validate({ ...example.request, screen: { ...example.request.screen, drill: [without] } }, input), key).not.toEqual([]);
    }
    expect(validate({ ...example.request, screen: { ...example.request.screen, drill: [{ ...one, extra: 1 }] } }, input)).not.toEqual([]);
    expect(validate({ ...example.request, screen: { ...example.request.screen, drill: Array.from({ length: 15 }, () => one) } }, input)).not.toEqual([]);
  });

  it('the instructions say how to talk about a drill\'s results: the misses one by one, and what to practise next', () => {
    const text = instructionsOf(grind.kind as string);
    for (const part of ['### Talk from a drill\'s results', '`screen.drill`', '`right_answer`', 'Why did I get these wrong?', 'What should I practise next?', 'Never say he answered anything the list does not show']) {
      expect(text).toContain(part);
    }
  });

  it('has a scenario that asks what STEPBible gives him and expects TBESG and its licence in the answer', () => {
    const example = readJson('grinds/examples/bible-talk/about-stepbible.json') as { request: { question: string; screen: { credits: unknown[] } }; expect: { answer: { matches: string } } };
    expect(example.request.question).toBe('What does STEPBible give me?');
    expect(example.request.screen.credits.length).toBeGreaterThan(20);
    const matches = new RegExp(example.expect.answer.matches);
    expect(matches.test('It gives you TBESG, the lexicon, under CC BY 4.0.')).toBe(true);
    expect(matches.test('It gives you a lexicon.')).toBe(false);
  });
});

describe('his requests (mw-vy3ghg.6)', () => {
  const text = instructionsOf('bible-talk').replace(/\s+/g, ' ');
  const statuses = ['sent', 'filed', 'building', 'landed', 'declined', 'adopted-as-setting', 'built-differently', 'moved'];

  it('tells the tutor to answer questions about his requests from `requests`, status by status, and not to refuse them', () => {
    expect(text).toContain('- `requests`:');
    expect(text).toContain('## His requests');
    for (const status of statuses) expect(text, status).toContain(`- \`${status}\``);
    expect(text).toContain('what happened to my idea');
    expect(text).toMatch(/does not get the one-sentence refusal/);
    expect(text).toMatch(/never invent a status/i);
  });

  it('tells it to offer an adopted setting in setting_offer, not to make it unasked', () => {
    expect(text).toMatch(/adopted-as-setting[\s\S]{0,300}switched on from here/);
    expect(text).toContain('`setting_offer`');
    expect(text).toMatch(/Do not put it in `settings_changes` unless he\s+has asked for it in words/);
  });

  it('carries a worked example that is a valid answer and offers a real setting', () => {
    const block = /<!-- requests-example:start -->\s*```json\s*([\s\S]*?)```\s*<!-- requests-example:end -->/.exec(text);
    expect(block, 'the example answer block').not.toBeNull();
    const answer = JSON.parse((block as RegExpExecArray)[1]) as { setting_offer?: { key: string; value: string } };
    expect(validate(answer, schema as Schema)).toEqual([]);
    expect(isTalkAnswer(answer)).toBe(true);
    expect(answer.setting_offer).toEqual({ key: 'theme', value: 'dark' });
    expect(SETTINGS.some((s) => s.key === 'theme')).toBe(true);
  });

  it('has a scenario for each status', () => {
    for (const name of ['sent', 'filed', 'building', 'landed', 'declined', 'adopted-as-setting', 'built-differently']) {
      const example = readJson(`grinds/examples/bible-talk/request-${name}.json`) as { request: { requests: { status: string }[] } };
      expect(example.request.requests[0].status).toBe(name);
    }
  });
});

// mw-5r3p30.241: Sound it out said 'aw' for αυ, where modern Greek (the app's voice and respelling) says af or av
describe('Sound it out speaks the app\'s pronunciation (mw-5r3p30.241)', () => {
  const text = instructionsOf('bible-talk').replace(/\s+/g, ' ');
  const input = readJson('grinds/bible-talk.input.schema.json') as Schema;
  const base = { reference: 'John 5:1', question: 'Help me pronounce this word.', history: [], solid_words: [], settings: {} };
  const sound = { form: 'ταῦτα', lemma: 'οὗτος', parse: 'demonstrative pronoun', kind: 'sound' };

  it('the request schema takes the pronunciation and a sound focus\'s respelling, and refuses a respelling of nothing', () => {
    expect(validate({ ...base, pronunciation: 'modern', focus: { ...sound, respelling: 'TAF-ta' } }, input)).toEqual([]);
    expect(validate({ ...base, focus: sound }, input)).toEqual([]);
    expect(validate({ ...base, focus: { ...sound, respelling: '' } }, input)).not.toEqual([]);
    expect(validate({ ...base, pronunciation: '' }, input)).not.toEqual([]);
  });

  it('the instructions name the pronunciation and the respelling the request carries', () => {
    expect(text).toContain('- `pronunciation`:');
    expect(text).toContain('`focus.respelling`');
  });

  // mw-5r3p30.268: the rules (αυ is af or av, never "aw"; β is v ...) moved into the scheme's tutorGuide, sent as pronunciation_guide; tests/unit/one-pronunciation-scheme.test.ts holds them there
  it('they say to describe each syllable by the respelling and the rules of pronunciation_guide, never by English habit or another pronunciation', () => {
    expect(text).toMatch(/describe each syllable's sound by `focus\.respelling` and the rules of `pronunciation_guide`/i);
    expect(text).toContain('- `pronunciation_guide`:');
    expect(text).toMatch(/never by English spelling habit or by any other pronunciation/);
    expect(validate({ ...base, pronunciation: 'modern', pronunciation_guide: 'Modern Greek: β is v.' }, input)).toEqual([]);
    expect(validate({ ...base, pronunciation_guide: '' }, input)).not.toEqual([]);
  });

  it('they say never to name a wrong sound, even as a warning, because the app reads the answer aloud (mw-5r3p30.282)', () => {
    expect(text).toMatch(/never by a wrong sound to avoid/);
    expect(text).toMatch(/not aw/);
    expect(text).toMatch(/never name a wrong sound/i);
  });

  // mw-5r3p30.719: the smoke saw "It is never 'aw' or 'ow'" in a right-looking answer: the guide's own 'never "aw"' was echoed as a denial
  it('they say a denial of a wrong sound is naming it, and that the guide\'s own "never" wording is not to be repeated to him (mw-5r3p30.719)', () => {
    expect(text).toMatch(/"it is never aw"/i);
    expect(text).toMatch(/pronunciation_guide[^.]*its "never" wording is for you/i);
  });

  // mw-5r3p30.725: the smoke saw 'because the next letter, τ, is one of those that make it "af" (never "aw" or "ow")': a parenthesis repeating the guide, in an answer that explained the rule
  it('they say to give the sound alone, with no parenthesis or clause about a sound it is not, and to read the answer through for aw and ow before returning it (mw-5r3p30.725)', () => {
    expect(text).toMatch(/not even in a parenthesis/i);
    expect(text).toMatch(/\(never "aw" or "ow"\)/);
    expect(text).toMatch(/before you return `answer`[^.]*\baw\b[^.]*\bow\b[^.]*cut/i);
    expect(text).toMatch(/do not explain which letters make αυ af or av/i);
  });

  it('they say never to cut a diphthong across two syllables', () => {
    expect(text).toMatch(/never split a pair of letters that makes one sound[^.]*αυ, ευ, ηυ, ου, αι, ει, οι, υι/i);
    expect(text).toMatch(/unless the second letter carries a diaeresis/);
  });

  // mw-5r3p30.274: the tutor called σβ a syllable of σβέννυτε and put the stress on the second; the app counts and the tutor repeats
  it('the request schema takes a sound focus\'s syllables and stress index, and refuses an empty list or a negative index', () => {
    expect(validate({ ...base, focus: { ...sound, respelling: 'ZVE-nee-te', syllables: ['σβέν', 'νυ', 'τε'], stress: 0 } }, input)).toEqual([]);
    expect(validate({ ...base, focus: { ...sound, syllables: [] } }, input)).not.toEqual([]);
    expect(validate({ ...base, focus: { ...sound, syllables: ['σβέν'], stress: -1 } }, input)).not.toEqual([]);
  });

  it('the instructions say to use focus.syllables and focus.stress verbatim, never to count, and that a cluster is no syllable', () => {
    expect(text).toContain('`focus.syllables`');
    expect(text).toContain('`focus.stress`');
    expect(text).toMatch(/Use them exactly/);
    expect(text).toMatch(/Never count or cut the word yourself/);
    expect(text).toMatch(/cluster of consonants such as σβ, πν or στ is never a syllable of its own/);
  });

  it('has a scenario for σβέννυτε whose request carries three syllables and stress 0, and whose answer names them with the stress on the first', () => {
    const example = readJson('grinds/examples/bible-talk/sound-it-out-svennyte.json') as { request: { focus: { syllables: string[]; stress: number } }; expect: Record<string, Record<string, unknown>> };
    expect(example.request.focus.syllables.map((x) => x.normalize('NFC'))).toEqual(['σβέν', 'νυ', 'τε'].map((x) => x.normalize('NFC')));
    expect(example.request.focus.stress).toBe(0);
    expect(example.expect['syllables.3']).toEqual({ present: false });
    expect(new RegExp(String(example.expect.answer.matches)).test('The stress falls on the first syllable, σβέν.')).toBe(true);
  });

  // mw-5r3p30.249: for ἁμάρτητε the tutor said the rough breathing makes an "h" ("ha-MAR-tee-teh"), which is Erasmian; the chosen pronunciation's breathing is silent
  it('says a breathing is told by the pronunciation guide and the respelling, never by a sound added from another pronunciation', () => {
    expect(text).toMatch(/what the accent or breathing tells him, by `pronunciation_guide` and `focus\.respelling` alone/);
    expect(text).toMatch(/never add a sound `focus\.respelling` does not write/);
    expect(text).toMatch(/a breathing mark is not a letter/i);
  });

  it('has a scenario that asks how to sound ἁμάρτητε and expects the app\'s respelling and no ha', () => {
    const example = readJson('grinds/examples/bible-talk/sound-it-out-hamartete.json') as { request: { pronunciation: string; focus: { form: string; respelling: string; kind: string } }; expect: Record<string, Record<string, string>> };
    expect(example.request.pronunciation).toBe('modern');
    expect(example.request.focus.kind).toBe('sound');
    expect(example.request.focus.respelling).toBe(pronunciationOf('modern').respell(example.request.focus.form.normalize('NFC')));
    expect(example.request.focus.respelling).toContain(example.expect.answer.contains);
    const noHa = new RegExp(example.expect.answer.matches);
    expect(noHa.test('ἁμάρτητε is said a-MAR-tee-te: the first syllable is just a, and the stress falls on MAR.')).toBe(true);
    for (const wrong of ['The rough breathing gives an h: ha-MAR-tee-te.', 'Say ha-MAR-tee-teh.', 'It starts with ha-']) expect(noHa.test(wrong), wrong).toBe(false);
  });

  // mw-5r3p30.692: after following a-MAR-tee-te for the focus word the tutor added "ha-mar-TA-ne-te" for a related form the request gave no respelling for
  it('says a word the request gives no respelling for is left unrespelled or respelled strictly by the guide, a rough breathing never an h', () => {
    expect(text).toMatch(/a word you say aloud that the request gives no `respelling` for/);
    expect(text).toMatch(/leave it unrespelled/i);
    expect(text).toMatch(/rough breathing is then never written as an? `h`/);
  });

  it('holds the same rule in verse-read, where Greek is also said aloud', () => {
    for (const kind of ['verse-read']) {
      const other = instructionsOf(kind);
      expect(other, kind).toMatch(/gives no `respelling` for/);
      expect(other, kind).toMatch(/rough breathing is never written as an `h`/);
    }
  });

  it('has a scenario whose request invites a second form (ἁμαρτάνετε, with no respelling) and whose answer never sounds the rough breathing on any word', () => {
    const example = readJson('grinds/examples/bible-talk/sound-it-out-related-form.json') as { request: { pronunciation: string; question: string; focus: { respelling: string }; greek_words: Array<{ form: string; respelling?: string }> }; expect: Record<string, Record<string, string>> };
    expect(example.request.pronunciation).toBe('modern');
    expect(example.request.question).toContain('ἁμαρτάνετε');
    expect(example.request.greek_words.find((w) => w.form === 'ἁμαρτάνετε')?.respelling).toBeUndefined();
    const noHa = new RegExp(example.expect.answer.matches);
    expect(noHa.test('Say a-MAR-tee-te. The present form ἁμαρτάνετε is a-mar-TA-ne-te.')).toBe(true);
    expect(noHa.test('Say a-MAR-tee-te. The related form is ha-mar-TA-ne-te.')).toBe(false);
  });

  it('has a scenario that asks how to sound ταῦτα and expects TAF and no aw', () => {
    const example = readJson('grinds/examples/bible-talk/sound-it-out-tauta.json') as { request: { pronunciation: string; focus: { respelling: string; kind: string } }; expect: Record<string, Record<string, string>> };
    expect(example.request.pronunciation).toBe('modern');
    expect(example.request.focus).toMatchObject({ kind: 'sound', respelling: 'TAF-ta' });
    expect(example.expect.answer.contains).toBe('TAF');
    const noAw = new RegExp(example.expect.answer.matches);
    expect(noAw.test('ταῦτα is said TAF-ta: the stress falls on TAF, where αυ is af.')).toBe(true);
    for (const wrong of ['ταῦτα is said TAW-ta.', 'The αυ sounds like aw in saw.', 'It sounds like Aw-ta.']) expect(noAw.test(wrong), wrong).toBe(false);
  });
});

// mw-5r3p30.582: Sepia joined the Theme setting, so a request 'Add a sepia theme' that was only filed, sent, building, landed or declined
// matched a setting and the tutor offered `theme: sepia` nobody asked for; the smoke of request-filed and request-landed failed.
describe('a setting is offered only when the turn asks for one', () => {
  const requests = instructionsOf('bible-talk');

  it('says a request offers a setting only at status adopted-as-setting, and never at any other', () => {
    expect(requests).toContain('Offer a setting only for an idea whose `status` is `adopted-as-setting`');
    for (const status of ['sent', 'filed', 'building', 'landed', 'declined', 'built-differently', 'moved']) expect(requests).toContain(`\`${status}\``);
    expect(requests).toMatch(/a setting that has the same name as the idea[^.]*is not an offer/);
  });

  // The examples that are about a setting: the offer waits and is answered, the offer is made, or he asks for the change in words.
  const ABOUT_SETTINGS = ['request-adopted-as-setting'];
  const dir = 'grinds/examples/bible-talk';
  const aboutNoSetting = readdirSync(dir).filter((f) => f.endsWith('.json') && !ABOUT_SETTINGS.includes(f.replace(/\.json$/, '')));

  it.each(aboutNoSetting)('%s asserts setting_offer absent', (file) => {
    const example = readJson(`${dir}/${file}`) as { expect: Record<string, unknown> };
    expect(example.expect.setting_offer, `${file}: add "setting_offer": { "present": false } to its expect`).toEqual({ present: false });
  });
});

// mw-5r3p30.727: the smoke missed now and then because an English word's question (`what does 'love' really mean?`) read as a Greek word's question, so the offer's word
// went into `words` too, and because a talk's `summary` was left out of an answer to a Greek-word question. The rules say it in one place each.
describe('two rules the smoke found not to hold (mw-5r3p30.727)', () => {
  const text = instructionsOf('bible-talk');
  const part = (title: string) => {
    const from = text.indexOf(title);
    const next = text.indexOf('\n## ', from + 5);
    return text.slice(from, next === -1 ? undefined : next);
  };

  it('keeps the word of a Greek offer out of `words`: an English word he names gets the offer and nothing in `words`', () => {
    const offering = part('## Offering the Greek');
    expect(offering).toMatch(/offer's `lemma` is not a `words` entry/);
    expect(offering).toMatch(/what does 'love' really mean[^.]*English question/);
  });

  it('writes `summary` whenever `fold` is present, whatever the question is about', () => {
    const so = part('## The conversation so far');
    expect(so).toMatch(/`summary` is part of every answer to a request with `fold`[^.]*whatever the question is about/);
  });

  it('does not grow: the instructions stay within the size they had when the smoke missed (137,397 bytes)', () => {
    const bytes = instructionParts('bible-talk').reduce((n, p) => n + Buffer.byteLength(p.text), 0);
    expect(bytes).toBeLessThanOrEqual(137_397);
  });
});

// mw-5r3p30.737: mw-5r3p30.732's trim kept the line mw-5r3p30.727 added (above) but cut what stood beside it, and two smoke examples missed again on 2026-10-23:
// summary-folds-fallen-turns (the contract's "`summary` when `fold` is present" became a bare name in a list of fields "only when their section calls for them", and
// "you must also write the new summary" became "write ... into one new summary") and bridge-quite-a-bit (the sentence to say, 'You are missing quite a bit for this', went).
describe('two rules the trim of mw-5r3p30.732 left too weak (mw-5r3p30.737)', () => {
  const text = instructionsOf('bible-talk');
  const flat = (s: string): string => s.replace(/\s+/g, ' ');
  const part = (title: string) => {
    const from = text.indexOf(title);
    const next = text.indexOf('\n## ', from + 5);
    return flat(text.slice(from, next === -1 ? undefined : next));
  };

  it('the contract says `summary` comes with `fold` and `bridge` with `missing_foundations`, where it lists the answer\'s fields', () => {
    const contract = part('## The contract');
    expect(contract).toMatch(/`bridge`[^.]{0,60}`missing_foundations`/);
    expect(contract).toMatch(/`summary` \(with `fold`/);
  });

  it('"The conversation so far" says you must write the summary whenever `fold` is present', () => {
    expect(part('## The conversation so far')).toMatch(/you must[^.]{0,60}`summary`/);
  });

  // mw-pn6o9b: the smoke example summary-folds-fallen-turns missed 2 of 3 on 2026-10-25 (`summary` absent). The rule stood in the middle of a part and once more in the contract; it now opens the
  // part as a rule of its own, with the cost of breaking it, and the last thing "How to answer" says is a check of it.
  it('"The conversation so far" opens with `fold` means `summary`, every time, and says an answer without it is wrong', () => {
    const so = part('## The conversation so far');
    const first = so.slice('## The conversation so far'.length).trim();
    expect(first).toMatch(/^\*\*[^*]*`fold`[^*]*MUST[^*]*`summary`[^*]*every time[^*]*\*\*/);
    expect(first.slice(0, first.indexOf('**', 2))).toMatch(/without it[^.]*wrong|wrong[^.]*without it/);
  });

  it('"How to answer" ends with a check: `fold` in the request is `summary` in the answer', () => {
    const how = part('## How to answer');
    expect(how.slice(-260)).toMatch(/`fold`[^.]*`summary`/);
  });

  it('"When he is not ready" has him tell the reader plainly that he is missing quite a bit when `total` is more than three', () => {
    expect(part('## When he is not ready')).toMatch(/`total` more than three:[^.]*['"]You are missing quite a bit for this/);
  });

  // mw-5r3p30.742: "most important first" beside `next` was read as the case he asked about (case-nominative, not ideas[0]); `next` has one reading.
  it('"When he is not ready" says `next` is always `ideas[0].id`, the order the ideas are learned, never the most important one', () => {
    const section = part('## When he is not ready');
    expect(section).toMatch(/`next` is always `ideas\[0\]\.id`/);
    expect(section).toMatch(/never the most important/);
    const bridgeRule = section.slice(section.indexOf('Put ONE `bridge`'), section.indexOf('Name the ideas'));
    expect(bridgeRule.indexOf('most important first')).toBeLessThan(bridgeRule.indexOf('`next`'));
  });
});

// mw-t3xu9a.5: the tutor client's words and answer fields are the kit's (voice-kit/talks/grind), included by `npm run grind:build`; the catalogue is request DATA.
describe('the tutor client in the bible-talk grind (mw-t3xu9a.5)', () => {
  const input = readJson('grinds/bible-talk.input.schema.json') as Schema;
  const inputProps = input.properties as Record<string, Schema>;
  const answerProps = schema.properties as Record<string, unknown>;
  const text = instructionsOf(grind.kind as string);
  const part = instructionParts(grind.kind as string).find(({ file }) => file.endsWith('360-the-app-you-can-ask.md'));
  const flat = (s: string): string => s.replace(/\s+/g, ' ');

  it('takes the facts (an object keyed by name), the catalogue and, in a follow-up, what was asked, as request data and never as instructions', () => {
    expect(inputProps.facts.type).toBe('object');
    expect(inputProps.catalogue.type).toBe('array');
    expect(inputProps.asked.type).toBe('object');
    for (const required of input.required as string[]) expect(['facts', 'catalogue', 'asked']).not.toContain(required);
    const request = { reference: 'Goal', question: 'what next', history: [], solid_words: [], settings: {}, facts: { 'where-he-is': { screen: 'Goal' } }, catalogue: [{ name: 'where-he-is', is: 'fact', core: true, tell: 'the screen he is on' }], asked: { works: [] } };
    expect(validate(request, input)).toEqual([]);
  });

  it('has the five fields of the kit fragment in the answer schema, each identical to the kit’s, and none required', () => {
    const fragment = answerFragment.properties as Record<string, unknown>;
    expect(Object.keys(fragment).sort()).toEqual(['asks', 'do', 'go', 'misses', 'said']);
    for (const key of Object.keys(fragment)) expect(answerProps[key], key).toEqual(fragment[key]);
    for (const key of Object.keys(fragment)) expect(schema.required).not.toContain(key);
    expect(readFileSync('node_modules/voice-kit/packages/talks/grind/answer.fragment.json', 'utf8')).toBeTruthy();
    expect(withKitFragment(schema)).toEqual(schema);
  });

  it('takes an answer that asks, does, goes and misses, and one that names a place of its own with the chapter as its args', () => {
    const answer = { answer: 'Taking you there.', question: 'take me to John 3', words: [] };
    for (const extra of [{ asks: ['works'] }, { do: [{ name: 'set-setting', args: { name: 'weave', value: 'off' } }], said: 'Turned the Greek off.' }, { go: { name: 'chapter', args: { book: 'John', chapter: 3 } } }, { misses: [{ wanted: 'the verses he marked', why: 'no fact holds them' }] }]) {
      expect(validate({ ...answer, ...extra }, schema as Schema), JSON.stringify(extra)).toEqual([]);
    }
    expect(validate({ ...answer, go: { book: 'John', chapter: 3 } }, schema as Schema)).not.toEqual([]);
    expect(validate({ ...answer, do: [{ args: {} }] }, schema as Schema)).not.toEqual([]);
  });

  it('includes the kit part byte for byte in part 360, before the marker the build fills, and says the Lampas lines after it', () => {
    expect(part, 'grinds/bible-talk.instructions/360-the-app-you-can-ask.md').toBeDefined();
    expect(text).toContain(instructionsPart);
    expect(part?.text).toContain(`${instructionsPart}${KIT_END}`);
    expect(withKitPart(part?.text ?? '')).toBe(part?.text);
    const own = flat(part?.text.slice(part.text.indexOf(KIT_END)) ?? '');
    for (const core of ['where-he-is', 'today-drill', 'settings']) expect(own).toContain(`\`${core}\``);
    expect(own).toMatch(/\bmiss/);
    expect(own).toContain('`screen.facts`');
  });

  it('says a passage already in held_passages is never fetched again, and fetches only what neither verses nor held_passages hold', () => {
    const part = instructionParts(grind.kind as string).find(({ file }) => file.endsWith('220-other-passages.md'));
    const text = (part?.text ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('A passage in `held_passages` or `verses` is never fetched again: answer from it.');
    expect(text).toContain('Only when the talk heads toward New Testament verses held in neither, name them in `fetch`');
  });

  it('says when to give a map link and that no map is promised that `maps` does not list (mw-zbjgn3r.4), and has an example for the map and for none listed', () => {
    const part = instructionParts(grind.kind as string).find(({ file }) => file.endsWith('200-links-to-his-study-resources.md'));
    const text = (part?.text ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('### Links to a map');
    expect(text).toContain("`kind` `map`, with `map` the `id` of a line of the request's `maps`, exactly as given");
    expect(text).toContain('name the map by its `title`');
    expect(text).toContain('Never promise a map `maps` does not list.');
    const read = (name: string) => readJson(`grinds/examples/bible-talk/${name}.json`) as unknown as { request: Record<string, unknown>; expect: Record<string, Record<string, unknown>> };
    const map = read('map-of-the-passage');
    expect((map.request.maps as { id: string }[]).map((m) => m.id)).toContain('SodomAndGomorrah');
    expect(map.expect['links.0.map']).toEqual({ equals: 'SodomAndGomorrah' });
    const none = read('no-map-listed');
    expect(none.request).not.toHaveProperty('maps');
    expect(none.expect.links).toEqual({ present: false });
  });

  it('keeps the whole of the instructions under the 99,500 bytes the ceiling test holds', () => {
    const bytes = instructionParts(grind.kind as string).reduce((sum, { text: t }) => sum + Buffer.byteLength(t, 'utf8'), 0);
    expect(bytes).toBeLessThanOrEqual(99_500);
  });

  it('leaves 500 bytes of room under that ceiling, now the Hebrew verse part is in (mw-gdcyf98.29; 2,500 were kept for it by mw-gdcyf98.28)', () => {
    const bytes = instructionParts(grind.kind as string).reduce((sum, { text: t }) => sum + Buffer.byteLength(t, 'utf8'), 0);
    expect(bytes).toBeLessThanOrEqual(99_000);
  });

  it('says a run of settings that differ only in their language once, and still names every key (mw-gdcyf98.28)', () => {
    const block = settingsBlock();
    for (const s of SETTINGS) expect(block, s.key).toContain(`\`${s.key}\``);
    expect(block.match(/Phone default lets the phone choose/g)).toHaveLength(1);
    expect(block.match(/is read aloud; 1 is normal/g)).toHaveLength(1);
    expect(block.match(/365 Days with Spurgeon/g)).toHaveLength(1);
  });

  it("tells the tutor, in the input schema, that a text ending in ' …' was clipped to fit and the rest is fetched by its reference (mw-5r3p30.827)", () => {
    const input = readJson('grinds/bible-talk.input.schema.json') as unknown as { properties: Record<string, { description?: string; items?: { properties: Record<string, { description?: string }> } }> };
    const flatText = (s: string | undefined) => (s ?? '').replace(/\s+/g, ' ');
    const held = flatText(input.properties.held_passages.description);
    expect(held).toContain("ends in ' …'");
    expect(held).toMatch(/clipped to fit/);
    expect(held).toMatch(/fetch the rest by its reference/);
    expect(held).toMatch(/never answer as if you held the whole passage/);
    const items = input.properties.held_passages.items?.properties ?? {};
    for (const key of ['greek', 'hebrew', 'english']) expect(flatText(items[key]?.description), `held_passages ${key}`).toContain("ends in ' …'");
    for (const key of ['greek', 'hebrew', 'english']) expect(flatText(input.properties[key].description), key).toContain("ends in ' …'");
    const bytes = instructionParts(grind.kind as string).reduce((sum, { text: t }) => sum + Buffer.byteLength(t, 'utf8'), 0);
    expect(bytes).toBeLessThanOrEqual(99_500);
  });

  it('has an example whose held passage is clipped and whose question needs a verse past the clip (mw-5r3p30.827)', () => {
    const ex = readJson('grinds/examples/bible-talk/held-passage-clipped.json') as unknown as { request: { held_passages: { greek: string; english: string }[] }; expect: Record<string, Record<string, unknown>> };
    const [held] = ex.request.held_passages;
    expect(held.english.endsWith(' …') || held.greek.endsWith(' …')).toBe(true);
    expect(ex.expect.fetch).toEqual({ present: true });
  });

  it('changes a setting by the set-setting command when the catalogue lists it, and by settings_changes when it does not', () => {
    const settings = flat(text.slice(text.indexOf('## Changing the app'), text.indexOf('<!-- settings:begin -->')));
    expect(settings).toContain('`set-setting`');
    expect(settings).toContain('`settings_changes`');
    expect(settings).toMatch(/Never claim a change the list does not have/);
  });

  it('takes him to a chapter through the place `chapter`, in the kit’s go', () => {
    const chapter = flat(text.slice(text.indexOf('## Taking him to a chapter'), text.indexOf('## Adding words')));
    expect(chapter).toContain('"name": "chapter"');
    expect(chapter).toContain('"args"');
  });

  it('has the four examples of the tutor client, each meeting what the kit’s answer examples show', () => {
    const read = (name: string) => readJson(`grinds/examples/bible-talk/${name}.json`) as unknown as { request: Record<string, unknown>; expect: Record<string, Record<string, unknown>> };
    const back = read('ask-back-works');
    expect(back.expect['asks.0']).toEqual({ equals: 'works' });
    expect(back.expect.words).toEqual({ equals: [] });
    expect((back.request.facts as Record<string, unknown>).works).toBeUndefined();
    expect((back.request.catalogue as { name: string; is: string }[]).find((e) => e.name === 'works')?.is).toBe('fact');
    const set = read('do-setting');
    expect(set.expect['do.0.name']).toEqual({ equals: 'set-setting' });
    expect(set.expect['do.0.args']).toEqual({ present: true });
    expect(set.expect.said).toEqual({ present: true });
    const go = read('go-review');
    expect(go.expect['go.name']).toEqual({ equals: 'review' });
    expect(go.expect.said).toBeDefined();
    const list = read('go-verse-list');
    expect(list.expect['go.name']).toEqual({ equals: 'lists' });
    expect(list.expect['go.args']).toEqual({ present: true });
    expect(list.expect.said).toEqual({ matches: 'Romans 8 hope' });
    const lists = (list.request.facts as Record<string, { id: number; name: string }[]>)['verse-lists'];
    expect(lists.find((l) => l.name === 'Romans 8 hope')?.id).toBe(2);
    expect(lists).toHaveLength(2);
    const miss = read('miss-recorded');
    expect(miss.expect['misses.0.wanted']).toEqual({ present: true });
    expect(miss.expect.do).toEqual({ present: false });
    expect(miss.expect.go).toEqual({ present: false });
  });

  it('is named in docs/ask-tutor.md: the four fields and the said line', () => {
    const doc = readFileSync('docs/ask-tutor.md', 'utf8');
    for (const field of ['asks', 'do', 'go', 'misses', 'said']) expect(doc, field).toContain(`\`${field}\``);
    expect(doc).toContain('360-the-app-you-can-ask.md');
  });
});

// mw-033i3s: asked what Greek he is memorizing in a verse not on the screen, the tutor asked for `memorizing`, a real fact (his verses' state) that
// does not hold their words, where the example wants `verseText`. The instructions name every fact the asks list allows, once, as the registry spells it,
// and say which of the memorize facts holds the words.
describe('the bible-talk instructions name each fact the tutor can ask for (mw-033i3s)', () => {
  const own = instructionsOf(grind.kind as string);
  const lampas = own.slice(own.indexOf('### In Lampas'));
  const askable = lampasRegistry().facts.map((fact) => fact.name).filter((name) => !['where-he-is', 'today-drill', 'settings'].includes(name));

  it('lists every askable fact in the one line that names them, spelled as the registry spells it', () => {
    expect(askable).toContain('verseText');
    const line = lampas.split('\n').find((l) => l.startsWith('- Core facts')) ?? '';
    for (const name of askable) expect(line, name).toContain(`\`${name}\``);
  });

  it('says the words of a memorized verse are `verseText`, not `memorizing`', () => {
    const rule = lampas.split('\n').find((l) => l.startsWith('- A memorized verse')) ?? '';
    expect(rule.replace(/\s+/g, ' ')).toMatch(/asks `verseText` alone[^.;]*not `memorizing`/);
  });
});

describe('the learner facts are told per language (mw-gdcyf98.31)', () => {
  const part = (kind: string, file: string): string => instructionParts(kind).find((p) => p.file.endsWith(file))!.text;

  it('bible-talk 245 and 010 no longer call solid_words and learner his Greek, and say they hold both languages', () => {
    const verse = part('bible-talk', '245-a-verse-of-the-old-testament.md');
    expect(verse).not.toMatch(/`solid_words` and `learner` are his Greek/);
    expect(verse).toMatch(/`solid_words` holds[^\n]*Hebrew[^\n]*`learner`'s `Hebrew:` part/);
    const contract = part('bible-talk', '010-the-contract.md');
    expect(contract).not.toMatch(/`solid_count`: how many Greek words/);
    expect(contract).toMatch(/`solid_count`: [^\n]*Greek and Hebrew/);
    expect(contract).toMatch(/`learner` \(maybe missing\):[^\n]*`Hebrew:`/);
    expect(contract).toMatch(/`words` lists only Greek words he asked about or that the answer teaches \(a Hebrew one[^\n]*`language` `he`\)/);
  });
});
