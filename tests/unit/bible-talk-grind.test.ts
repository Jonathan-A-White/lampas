// The bible-talk grind (grinds/bible-talk.json) is read by the mill, not by this app: it has the keys of the verse-ask grind
// (and so of SpellForge's tutor-turn.json), its instructions carry the one-sentence refusal, and its answer schema agrees
// with isTalkAnswer, the guard the phone runs.
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { learnerGrammarOf } from '../../src/data/grammar/learnerGrammar';
import { pronunciationOf } from '../../src/speech/pronunciation';
import { FEEDBACK_SUMMARY_MAX, NO_SETTING, REFUSAL, isTalkAnswer } from '../../src/services/talk';
import { formatJson, settingsBlock, withSettingsBlock, withSettingsChanges } from '../../src/settings/grindText';
import { SETTINGS } from '../../src/settings/registry';
import { TALK_PICTURE_MAX_BYTES } from '../../src/talk/pictures';
import { validate, type Schema } from '../support/schema-validate';
import { instructionsOf } from '../../scripts/grind-parts';

const readJson = (rel: string): Record<string, unknown> => JSON.parse(readFileSync(rel, 'utf8')) as Record<string, unknown>;
const grind = readJson('grinds/bible-talk.json');
const verseAsk = readJson('grinds/verse-ask.json');
const schema = readJson('grinds/bible-talk.answer.schema.json');

describe('grinds/bible-talk.json', () => {
  it('has the same keys as grinds/verse-ask.json, for the lampas app and the bible-talk kind', () => {
    expect(Object.keys(grind).sort()).toEqual(Object.keys(verseAsk).sort());
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
    for (const bad of [{ table: 'The article', kind: 'paradigm' }, { ...paradigm, kind: 'grammar-term' }, { ...paradigm, extra: 1 }, { ...paradigm, table: '' }, { ...paradigm, revealed: [''] }, { ...paradigm, revealed: Array.from({ length: 41 }, () => 'ὁ') }]) {
      expect(validate({ ...request, focus: bad }, input), JSON.stringify(bad)).not.toEqual([]);
    }
  });

  it('the instructions tell the companion what a paradigm focus is and how to answer it', () => {
    const text = instructionsOf(grind.kind as string);
    for (const part of ['`paradigm`', '`focus.revealed`', 'Help with a paradigm table', 'Leave `syllables` out']) expect(text).toContain(part);
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
    for (const kind of ['bible-talk', 'verse-ask', 'verse-read', 'tips']) {
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
      { name: 'Goal', facts: [{ label: 'Goal', value: 'x'.repeat(201) }] },
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
  const base = { reference: 'Settings', question: "What's the benefit of Accordance?", history: [], solid_words: [], settings: {} };
  const settings = [
    { name: 'Weave', value: 'Solid words', help: 'Greek words you know stand in the English.' },
    { name: 'Accordance', value: 'Off', help: 'Adds Open in Accordance: the word in your own lexicon in the Accordance app.' },
  ];

  it('the request schema takes a screen with settings, each a name, a value and its help, and refuses a bad one', () => {
    expect(validate({ ...base, screen: { name: 'Settings', facts: [], settings } }, input)).toEqual([]);
    expect(validate({ ...base, screen: { name: 'Settings', facts: [] } }, input)).toEqual([]);
    const many = Array.from({ length: 51 }, (_, i) => ({ name: `S${i}`, value: 'On', help: 'h' }));
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

  it('the instructions work "What\'s the benefit of Accordance?" through: it names Accordance, its Open in Accordance link and the app on the phone', () => {
    const text = instructionsOf(grind.kind as string);
    const example = text.slice(text.indexOf("What's the benefit of Accordance?"));
    expect(example.length).toBeGreaterThan(0);
    const worked = example.slice(0, 900);
    for (const part of ['Accordance', 'Open in Accordance', 'lexicon', 'app on his phone']) expect(worked).toContain(part);
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

  it('offers to send an ask that would grow the app (an approach, programme, resource, text or translation) to the makers (mw-hqd5bz.37)', () => {
    for (const words of ['an approach or programme', 'a study resource', 'a text', 'a translation', 'Send this to the makers', 'Ask for more', "I'd like Lampas to have "]) {
      expect(instructions).toContain(words);
    }
  });

  it("carries the worked example 'Can this work with Accordance's competitor, Olive Tree?' and the offer it yields", () => {
    expect(instructions).toContain("Can this work with Accordance's competitor, Olive Tree?");
    const block = /<!-- feedback-offer-example:start -->\s*```json\s*([\s\S]*?)```\s*<!-- feedback-offer-example:end -->/.exec(instructions);
    expect(block, 'the example answer block').not.toBeNull();
    const answer = JSON.parse((block as RegExpExecArray)[1]) as { feedback_offer?: { summary: string } };
    expect(answer.feedback_offer?.summary).toMatch(/Olive Tree/);
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
  const statuses = ['sent', 'filed', 'building', 'landed', 'declined', 'adopted-as-setting'];

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
    for (const name of ['sent', 'filed', 'building', 'landed', 'declined', 'adopted-as-setting']) {
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

  it('holds the same rule in verse-ask and verse-read, where Greek is also said aloud', () => {
    for (const kind of ['verse-ask', 'verse-read']) {
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
    for (const status of ['sent', 'filed', 'building', 'landed', 'declined']) expect(requests).toContain(`\`${status}\``);
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
