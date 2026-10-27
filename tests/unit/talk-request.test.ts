// The request the bible-talk grind is sent: the scope's text, the last 10 turns, and a fit to the grist's size cap.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { type Chapter, NO_CHAPTER, markSupplied } from '../../src/data/chapter';
import { learnerGrammarOf, type LearnerGrammar } from '../../src/data/grammar/learnerGrammar';
import { greekSyllables, stressedSyllable } from '../../src/speech/greekSyllables';
import { pronunciationOf, DEFAULT_PRONUNCIATION } from '../../src/speech/pronunciation';
import { db } from '../../src/data/db';
import { lampasRegistry, withTutorFacts } from '../../src/tutor/registry';
import { MAX_HISTORY_TURNS, MAX_REQUEST_BYTES, GREEK_WORDS_BYTES, MAX_TALK_CHARS, buildTalkRequest, fitHistory, scopeRef, termQuestion, type TalkRequest } from '../../src/services/talk';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const john = JSON.parse(readFileSync('public/data/1jn/2.json', 'utf8')) as Chapter;
const thess = JSON.parse(readFileSync('public/data/1th/5.json', 'utf8')) as Chapter;
const turn = (i: number, a = `Answer ${i}`) => ({ q: `Question ${i}`, a });
const size = (r: TalkRequest) => new TextEncoder().encode(JSON.stringify(r)).length;

// a field as full as it may be: 12 titles at each level
const FIELD: LearnerGrammar = learnerGrammarOf({
  goal: 'Read 1 John 1:1',
  words: { solid: 3, frontier: 2, notYet: 9 },
  ideas: (['solid', 'frontier', 'notYet'] as const).flatMap((level) => Array.from({ length: 12 }, (_, i) => ({ id: `${level}${i}`, title: `Idea ${level} ${i}`, level }))),
  placed: true,
  move: 'up',
  pickerLevel: 'solid',
  approach: { name: 'Lampas ladder', credit: null, nextLesson: 'The nominative' },
});

describe('buildTalkRequest', () => {
  it('carries the learner summary when given one, and no learner key when not', () => {
    const scope = { title: 'Romans 8', chapter, verse: null };
    expect(buildTalkRequest(scope, 'Why?', [], [], {}, undefined, 'solid 1 word; learning: none; new today: none; due now: 0').learner).toBe('solid 1 word; learning: none; new today: none; due now: 0');
    expect('learner' in buildTalkRequest(scope, 'Why?', [], [])).toBe(false);
  });

  it('carries learner_grammar when given one, and no such key when not', () => {
    const scope = { title: 'Romans 8', chapter, verse: null };
    expect(buildTalkRequest(scope, 'Why?', [], [], {}, undefined, undefined, FIELD).learner_grammar).toEqual(FIELD);
    expect('learner_grammar' in buildTalkRequest(scope, 'Why?', [], [])).toBe(false);
  });

  it('about a verse: its reference, its Greek and English', () => {
    const verse = chapter.verses.find((v) => v.n === 9);
    if (!verse) throw new Error('no verse 9');
    const r = buildTalkRequest({ title: 'Romans 8', chapter, verse }, '  Why?  ', [], ['θεός']);
    expect(r.reference).toBe('Romans 8:9');
    expect(r.greek).toBe(verse.g.map((w) => w.t).join(' '));
    expect(r.english).toBe(verse.e.map(markSupplied).join(' '));
    expect(r.question).toBe('Why?');
    expect(r.solid_words).toEqual(['θεός']);
    expect(r.history).toEqual([]);
  });

  it('about the chapter: the reference is the chapter and the text is its first three verses', () => {
    const r = buildTalkRequest({ title: 'Romans 8', chapter, verse: null }, 'Why?', [], []);
    expect(r.reference).toBe('Romans 8');
    expect(r.greek).toBe(chapter.verses.slice(0, 3).map((v) => v.g.map((w) => w.t).join(' ')).join(' '));
    expect(r.english).toBe(chapter.verses.slice(0, 3).map((v) => v.e.map(markSupplied).join(' ')).join(' '));
  });

  // mw-5r3p30.246: the tutor named τέκνον as the lemma of Τεκνία on 1 John 2:1 because it had only the verse's plain Greek; it is now handed each word's lemma, gloss and parse
  it('gives the tutor each Greek word with its lemma, gloss and parse from the chapter data (1 John 2:1: Τεκνία is from τεκνίον, not τέκνον)', () => {
    const verse = john.verses.find((v) => v.n === 1);
    if (!verse) throw new Error('no verse 1');
    const r = buildTalkRequest({ title: '1 John 2', chapter: john, verse }, 'What paradigm takes me from the dictionary form to Τεκνία?', [], []);
    expect(r.greek_words).toHaveLength(verse.g.length);
    expect(r.greek_words?.[0]).toMatchObject({ form: 'Τεκνία', lemma: 'τεκνίον', gloss: 'children', parse: 'noun, vocative plural neuter' });
    expect(JSON.stringify(r.greek_words)).not.toContain('τέκνον');
    expect(r.greek_words?.map((w) => w.form)).toEqual(verse.g.map((w) => w.t));
  });

  it('lists a form once when the passage repeats it with the same lemma and parse', () => {
    const verse = john.verses.find((v) => v.n === 1);
    if (!verse) throw new Error('no verse 1');
    const twice = { ...verse, g: [...verse.g, verse.g[0]] };
    const r = buildTalkRequest({ title: '1 John 2', chapter: john, verse: twice }, 'Why?', [], []);
    expect(r.greek_words).toHaveLength(verse.g.length);
  });

  it('about the chapter: the words of the first three verses, and none in a talk from a screen', () => {
    const r = buildTalkRequest({ title: '1 John 2', chapter: john, verse: null }, 'Why?', [], []);
    expect(r.greek_words?.[0].lemma).toBe('τεκνίον');
    const first3 = john.verses.slice(0, 3).flatMap((v) => v.g.map((w) => w.t));
    // the list is the text's words in order, and stops where the byte budget does
    const listed = r.greek_words?.map((w) => w.form) ?? [];
    expect(listed.length).toBeGreaterThan(15);
    expect(listed.every((form, i) => first3.includes(form) && (i === 0 || first3.indexOf(form) >= 0))).toBe(true);
    expect(new TextEncoder().encode(JSON.stringify(r.greek_words)).length).toBeLessThanOrEqual(GREEK_WORDS_BYTES);
    const screen = buildTalkRequest({ title: 'Goal', chapter: NO_CHAPTER, verse: null, screen: { name: 'Goal', facts: [] } }, 'Why?', [], []);
    expect('greek_words' in screen).toBe(false);
  });

  it('sends only the last 10 turns, oldest first', () => {
    const turns = Array.from({ length: 13 }, (_, i) => turn(i + 1));
    const r = buildTalkRequest({ title: 'Romans 8', chapter, verse: null }, 'Why?', turns, []);
    expect(MAX_HISTORY_TURNS).toBe(10);
    expect(r.history.map((t) => t.q)).toEqual(Array.from({ length: 10 }, (_, i) => `Question ${i + 4}`));
  });

  it('carries the settings as they stand, so a talk can say "slower" from where they are', () => {
    const r = buildTalkRequest({ title: 'Romans 8', chapter, verse: null }, 'Why?', [], [], { greekRate: 1, theme: 'phone' });
    expect(r.settings).toEqual({ greekRate: 1, theme: 'phone' });
    expect(buildTalkRequest({ title: 'Romans 8', chapter, verse: null }, 'Why?', [], []).settings).toEqual({});
  });

  it('carries the focus when there is one, and no focus key when there is not', () => {
    const scope = { title: 'Romans 8', chapter, verse: chapter.verses.find((v) => v.n === 28) ?? null };
    const focus = { form: 'συνεργεῖ', lemma: 'συνεργέω', parse: 'verb', kind: 'sound' as const };
    expect(buildTalkRequest(scope, 'Help', [], [], {}, focus).focus).toEqual({ ...focus, respelling: 'see-ner-YEE', syllables: ['συ', 'νερ', 'γεῖ'], stress: 2 });
    expect('focus' in buildTalkRequest(scope, 'Help', [], [], {})).toBe(false);
  });

  // mw-5r3p30.241: the tutor explains a sound by the app's own pronunciation, so the request says which and gives the word's respelling
  it('carries the Greek pronunciation in use, modern by default', () => {
    const scope = { title: 'Romans 8', chapter, verse: null };
    expect(buildTalkRequest(scope, 'Why?', [], []).pronunciation).toBe('modern');
    const asked = buildTalkRequest(scope, 'Why?', [], [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, 'modern');
    expect(asked.pronunciation).toBe('modern');
  });

  // mw-5r3p30.268: the sound rules are the scheme's, not the grind's; they go with the request, and give way first when the record is full
  it("carries the pronunciation's guide from its scheme, and a full record drops it before any turn unless the question is about a sound", () => {
    const scope = { title: 'Romans 8', chapter, verse: null };
    const guide = buildTalkRequest(scope, 'Why?', [], []).pronunciation_guide;
    expect(guide).toMatch(/^Modern Greek/);
    const long = Array.from({ length: MAX_HISTORY_TURNS }, (_, i) => turn(i, 'x'.repeat(300)));
    const full = fitHistory(buildTalkRequest(scope, 'Why?', long, []));
    expect(full.pronunciation_guide).toBeUndefined();
    expect(full.history.length).toBe(MAX_HISTORY_TURNS);
    expect(size(full)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    const sound = { form: 'ταῦτα', lemma: 'οὗτος', parse: 'pronoun', kind: 'sound' as const };
    expect(fitHistory(buildTalkRequest(scope, 'Help', long, [], {}, sound)).pronunciation_guide).toBe(guide);
    expect(fitHistory(buildTalkRequest(scope, 'Why?', [], [])).pronunciation_guide).toBe(guide);
  });

  // mw-5r3p30.274: the tutor called σβ a syllable of σβέννυτε and put the stress on the second; the app counts, the tutor repeats
  it('gives a Greek sound question the app\'s syllables and the index of the stressed one (σβέννυτε is σβέν, νυ, τε, stressed on the first)', () => {
    const scope = { title: '1 Thessalonians 5', chapter, verse: null };
    const sound = { form: 'σβέννυτε', lemma: 'σβέννυμι', parse: 'verb, present active imperative, 2nd person plural', kind: 'sound' as const };
    const focus = buildTalkRequest(scope, 'Help', [], [], {}, sound).focus;
    expect(focus).toMatchObject({ respelling: 'ZVE-nee-te', syllables: ['σβέν', 'νυ', 'τε'], stress: 0 });
    const request = buildTalkRequest(scope, 'Help', [], [], {}, { ...sound, form: 'προσεύχεσθε' });
    expect(request.focus).toMatchObject({ syllables: ['προ', 'σεύ', 'χε', 'σθε'], stress: 1 });
  });

  // mw-5r3p30.568: typed or spoken ("how do I say σβέννυτε?") the request has no focus, and the tutor counted σβ as a syllable again; every word of the text now carries the app's syllables
  it('hands the tutor σβέννυτε\'s syllables, stress and respelling in greek_words when he types "how do I say σβέννυτε?" with no focus', () => {
    const verse = thess.verses.find((v) => v.n === 19);
    if (!verse) throw new Error('no verse 19');
    const r = buildTalkRequest({ title: '1 Thessalonians 5', chapter: thess, verse }, 'how do I say σβέννυτε?', [], []);
    expect('focus' in r).toBe(false);
    expect(r.greek_words?.find((w) => w.form === 'σβέννυτε')).toEqual({
      form: 'σβέννυτε',
      lemma: 'σβέννυμι',
      gloss: expect.any(String),
      parse: 'verb, present active imperative, 2nd person plural',
      respelling: 'ZVE-nee-te',
      syllables: ['σβέν', 'νυ', 'τε'],
      stress: 0,
    });
  });

  it('keeps a word the question names in the list even when the list stops before it, and the list stays in text order', () => {
    const last = thess.verses[thess.verses.length - 1];
    const passage = { ...last, g: thess.verses.flatMap((v) => v.g) };
    const word = passage.g[passage.g.length - 2].t;
    const plain = buildTalkRequest({ title: '1 Thessalonians 5', chapter: thess, verse: passage }, 'Why?', [], []);
    expect(plain.greek_words?.some((w) => w.form === word)).toBe(false);
    const asked = buildTalkRequest({ title: '1 Thessalonians 5', chapter: thess, verse: passage }, `how do I say ${word.normalize('NFD')}?`, [], []);
    const entry = asked.greek_words?.find((w) => w.form === word);
    expect(entry?.syllables).toEqual(greekSyllables(word));
    const order = (asked.greek_words ?? []).map((w) => passage.g.findIndex((g) => g.t === w.form));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(size(asked)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
  });

  // the sweep: every word of 1 Thessalonians 5 the tutor can be asked about without a focus reaches it with the app's own syllables, stress and respelling
  it('every word of a verse of 1 Thessalonians 5 reaches the tutor with the app\'s syllables, stress and respelling', () => {
    const pron = pronunciationOf(DEFAULT_PRONUNCIATION);
    let checked = 0;
    for (const verse of thess.verses) {
      const r = buildTalkRequest({ title: '1 Thessalonians 5', chapter: thess, verse }, 'how do I say this?', [], []);
      const forms = new Set(verse.g.map((w) => w.t));
      expect(r.greek_words?.length, `verse ${verse.n}`).toBeGreaterThan(0);
      for (const w of r.greek_words ?? []) {
        const syllables = greekSyllables(w.form);
        const stress = stressedSyllable(syllables);
        expect(forms.has(w.form)).toBe(true);
        expect(w.syllables, w.form).toEqual(syllables);
        expect(w.respelling, w.form).toBe(pron.respell(w.form));
        if (stress >= 0) expect(w.stress, w.form).toBe(stress);
        else expect('stress' in w, w.form).toBe(false);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(150);
  });

  it('gives no syllables to a grammar, word or Hebrew focus, and no stress to an unaccented word', () => {
    const scope = { title: 'John 5', chapter, verse: null };
    const sound = { form: 'σβέννυτε', lemma: 'σβέννυμι', parse: 'verb', kind: 'sound' as const };
    for (const kind of ['grammar', 'word'] as const) expect(buildTalkRequest(scope, 'Help', [], [], {}, { ...sound, kind }).focus).toEqual({ ...sound, kind });
    const hebrew = { form: 'צֶדֶק', lemma: 'צֶדֶק', parse: 'Hebrew word', kind: 'sound' as const, language: 'he' as const };
    expect(buildTalkRequest(scope, 'Help', [], [], {}, hebrew).focus).toEqual(hebrew);
    const plain = buildTalkRequest(scope, 'Help', [], [], {}, { ...sound, form: 'μου' }).focus;
    expect(plain).toMatchObject({ syllables: ['μου'] });
    expect(plain).not.toHaveProperty('stress');
  });

  it('gives a sound question the app\'s respelling of the word (αυ before τ is AF), and no other focus one', () => {
    const scope = { title: 'John 5', chapter, verse: null };
    const sound = { form: 'ταῦτα', lemma: 'οὗτος', parse: 'demonstrative pronoun', kind: 'sound' as const };
    const request = buildTalkRequest(scope, 'Help', [], [], {}, sound);
    expect(request.focus).toEqual({ ...sound, respelling: 'TAF-ta', syllables: ['ταῦ', 'τα'], stress: 0 });
    const grammar = { ...sound, kind: 'grammar' as const };
    expect(buildTalkRequest(scope, 'Help', [], [], {}, grammar).focus).toEqual(grammar);
    const hebrew = { form: 'צֶדֶק', lemma: 'צֶדֶק', parse: 'Hebrew word', kind: 'sound' as const, language: 'he' as const };
    expect(buildTalkRequest(scope, 'Help', [], [], {}, hebrew).focus).toEqual(hebrew);
  });

  it('carries a grammar term focus, and asks about the term by name with the reference', () => {
    const scope = { title: 'Romans 8', chapter, verse: chapter.verses.find((v) => v.n === 2) ?? null };
    const focus = { term: 'conjunction', kind: 'grammar-term' as const };
    expect(buildTalkRequest(scope, termQuestion('conjunction', 'Romans 8:2'), [], [], {}, focus).focus).toEqual(focus);
    const question = termQuestion('conjunction', 'Romans 8:2');
    expect(question).toContain('conjunction');
    expect(question).toContain('Romans 8:2');
    expect(question).toContain('Explain the grammar term');
  });

  it('keeps a question to 4000 characters, the same as Ask the tutor', () => {
    expect(MAX_TALK_CHARS).toBe(4000);
  });
});

describe('fitHistory', () => {
  const base = (history: TalkRequest['history']): TalkRequest => ({ reference: 'Romans 8', greek: 'α'.repeat(300), english: 'x'.repeat(300), question: 'Why?', history, solid_words: [], settings: { greekRate: 1 } });

  it('leaves a request that fits as it is', () => {
    const r = base(Array.from({ length: 10 }, (_, i) => turn(i)));
    expect(fitHistory(r)).toEqual(r);
  });

  it('clips the oldest long answers first and then drops the oldest turns, until the request fits', () => {
    const long = 'y'.repeat(1500);
    const r = base(Array.from({ length: 10 }, (_, i) => turn(i, long)));
    expect(size(r)).toBeGreaterThan(MAX_REQUEST_BYTES);
    const fitted = fitHistory(r);
    expect(size(fitted)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    // the newest turn is whole, the oldest was clipped or dropped
    expect(fitted.history[fitted.history.length - 1]).toEqual(turn(9, long));
    expect(fitted.history[0].a.length).toBeLessThan(long.length);
    // what is kept is still in order and ends with the newest
    expect(fitted.history.map((t) => t.q)).toEqual(r.history.slice(r.history.length - fitted.history.length).map((t) => t.q));
  });

  it('clips the history and never learner_grammar, with a full history and the field at its fullest', () => {
    expect(size({ ...base([]), learner_grammar: FIELD })).toBeGreaterThan(size(base([])) + 700);
    const r = { ...base(Array.from({ length: 10 }, (_, i) => turn(i, 'y'.repeat(1500)))), learner: 'x'.repeat(600), learner_grammar: FIELD };
    expect(size(r)).toBeGreaterThan(MAX_REQUEST_BYTES);
    const fitted = fitHistory(r);
    expect(size(fitted)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(fitted.learner_grammar).toEqual(FIELD);
    expect(fitted.history.length).toBeGreaterThan(0);
  });

  it('cuts the words of a long passage from the end before it drops a turn of the conversation (a quiz needs its earlier turns)', () => {
    const words = Array.from({ length: 60 }, (_, i) => ({ form: `φ${i}`.repeat(4), lemma: `λ${i}`.repeat(4), gloss: 'g'.repeat(20), parse: 'noun, nominative plural masculine' }));
    const r = { ...base(Array.from({ length: 10 }, (_, i) => turn(i, 'y'.repeat(1500)))), greek_words: words };
    expect(size(r)).toBeGreaterThan(MAX_REQUEST_BYTES);
    const fitted = fitHistory(r);
    expect(size(fitted)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(fitted.history).toHaveLength(10);
    expect(fitted.greek_words).toEqual(words.slice(0, fitted.greek_words?.length));
    expect(fitted.greek_words?.length ?? 0).toBeLessThan(60);
  });

  it('keeps the words of the text when clipping the history is enough, and cuts them from the end only when the history is gone', () => {
    const words = Array.from({ length: 20 }, (_, i) => ({ form: `φ${i}`.repeat(4), lemma: `λ${i}`.repeat(4), gloss: 'g'.repeat(20), parse: 'noun, nominative plural masculine' }));
    const r = { ...base(Array.from({ length: 10 }, (_, i) => turn(i, 'y'.repeat(1500)))), greek_words: words };
    const fitted = fitHistory(r);
    expect(size(fitted)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(fitted.greek_words).toEqual(words);
    const tooMany = { ...base([]), greek_words: Array.from({ length: 200 }, () => words[0]) };
    expect(size(tooMany)).toBeGreaterThan(MAX_REQUEST_BYTES);
    const cut = fitHistory(tooMany);
    expect(size(cut)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(cut.greek_words?.length).toBeGreaterThan(0);
    expect(cut.greek_words?.length).toBeLessThan(200);
  });

  it('drops the whole history when even one clipped turn cannot fit', () => {
    // the weight is a field that is never cut: the text of a passage is clipped before a turn is dropped (tests/unit/long-passage-fits.test.ts)
    const r = { ...base([turn(1, 'z'.repeat(1500))]), learner: 'l'.repeat(9000) };
    expect(fitHistory(r).history).toEqual([]);
  });
});

describe('a talk from a screen (mw-5r3p30.91)', () => {
  const screen = { name: 'Goal', facts: [{ label: 'Goal', value: 'Read 1 John 1:1' }] };
  const scope = { title: 'Goal', chapter, verse: null, screen };

  it('carries the screen, names the screen as its reference and has no verse text', () => {
    const r = buildTalkRequest(scope, ' Where am I? ', [], ['θεός']);
    expect(r.screen).toEqual(screen);
    expect(r.reference).toBe('Goal');
    expect('greek' in r).toBe(false);
    expect('english' in r).toBe(false);
    expect(r.question).toBe('Where am I?');
    expect(r.solid_words).toEqual(['θεός']);
  });

  it('is kept under the screen, whatever chapter is open, and a chapter talk carries no screen key', () => {
    expect(scopeRef('rom', 8, scope)).toBe('screen.goal');
    expect(scopeRef('1jn', 1, scope)).toBe('screen.goal');
    expect(scopeRef('rom', 8, { ...scope, screen: { name: 'My study way', facts: [] } })).toBe('screen.my-study-way');
    expect('screen' in buildTalkRequest({ title: 'Romans 8', chapter, verse: null }, 'Why?', [], [])).toBe(false);
  });

  it('fitHistory never cuts the screen', () => {
    const history = Array.from({ length: 10 }, (_, i) => turn(i, 'x'.repeat(2000)));
    const r = fitHistory(buildTalkRequest(scope, 'Why?', history, []));
    expect(r.screen).toEqual(screen);
    expect(size(r)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
  });
});

describe('the request through the tutor client (mw-t3xu9a.4)', () => {
  afterAll(() => db.close());
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.settings.clear(), db.words.clear(), db.reviews.clear(), db.meta.clear()]);
    await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }]);
    window.location.hash = '#/?b=rom&c=8&v=28';
  });
  const scope = { title: 'Romans 8', chapter, verse: chapter.verses[27] };
  // a screen's talk holds no verse text, so the padded requests below have room for the client's part (the catalogue, with its commands, weighs about 4,200 bytes)
  const screenScope = { title: 'Goal', chapter, verse: null, screen: { name: 'Reader', facts: [] } };
  const fields = (s: typeof scope | typeof screenScope = scope) => buildTalkRequest(s, 'What is on my drill today?', [turn(1), turn(2)], ['λόγος'], { theme: 'dark', greekPronunciation: 'modern' }, undefined, 'solid 1 word', undefined, [], [], 0, { kept: '' }, undefined, [], undefined, DEFAULT_PRONUNCIATION, false, undefined, undefined, undefined, undefined, [], undefined, [{ kind: 'review', title: 'Review: 3 due', done: false }]);

  it('carries the where-he-is, today-drill and settings facts, and the catalogue', async () => {
    const built = await withTutorFacts(fields(), 2);
    expect(Object.keys(built.facts ?? {}).sort()).toEqual(['settings', 'today-drill', 'where-he-is']);
    expect(built.facts?.['where-he-is']).toEqual({ screen: 'Reader', route: 'home', reader: { book: 'rom', chapter: 8, verse: 28 } });
    expect(built.facts?.settings).toMatchObject({ greekPronunciation: expect.any(String) });
    expect(Array.isArray(built.facts?.['today-drill'])).toBe(true);
    expect(built.catalogue?.map((c) => c.name)).toEqual(lampasRegistry().catalogue().map((c) => c.name));
  });

  it('carries every field it carried before, unchanged: the names and the values', async () => {
    const before = fields();
    const built = await withTutorFacts(before, 2);
    const rest: Partial<TalkRequest> = { ...built };
    delete rest.facts;
    delete rest.catalogue;
    expect(Object.keys(rest)).toEqual(Object.keys(before));
    expect(rest).toEqual(before);
    expect(Object.keys(built).filter((k) => !(k in before)).sort()).toEqual(['catalogue', 'facts']);
  });

  // The first `over` went from 800 to 900 with When you copy: its four settings ride in settings and in the settings fact, ~170 bytes the request already carried. The three `over` sizes below are hand-sized to the catalogue (the cut of tells, then the catalogue, then the facts): memorizing's seven entries (mw-fu7dqf.12) moved them by 1,712 bytes (the first from 500 to 800: the request is already over the cap before its padding; then 900, the place diagram-lesson of mw-q6t5tvn.1 adding about 75)
  // a request of the size the tutor's part leaves `over` bytes beyond the cap: its learner line (which no cut touches) pads it
  const padded = async (over: number) => {
    const base = (pad: number) => ({ ...fields(screenScope), history: Array.from({ length: 6 }, (_, i) => turn(i)), learner: 'y'.repeat(pad) });
    const extra = size(await withTutorFacts(base(0), 6)) - size(base(0));
    const pad = MAX_REQUEST_BYTES - size(base(0)) - extra + over;
    return { plain: base(pad), built: await withTutorFacts(base(pad), 6) };
  };

  it('fits the grist with the facts in it: the tell lines go first and the turns stay', async () => {
    const { plain, built } = await padded(900);
    expect(size(plain)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(size(built)).toBeGreaterThan(MAX_REQUEST_BYTES);
    const fitted = fitHistory(built, 0, 'rom.8@1');
    expect(size(fitted) + new TextEncoder().encode(',"talk":"rom.8@1"').length).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(fitted.history).toEqual(plain.history);
    expect(Object.keys(fitted.facts ?? {}).sort()).toEqual(['settings', 'today-drill', 'where-he-is']);
    expect(fitted.catalogue?.map((c) => c.name)).toEqual(built.catalogue?.map((c) => c.name));
    expect(fitted.catalogue?.some((c) => c.tell === undefined)).toBe(true);
  });

  it('then drops the facts that repeat a field of the request, and still keeps the turns', async () => {
    const { plain, built } = await padded(3400);
    const fitted = fitHistory(built, 0, 'rom.8@1');
    expect(fitted.history).toEqual(plain.history);
    expect(fitted.settings).toEqual(plain.settings);
    expect(fitted.today).toEqual(plain.today);
    expect(fitted.facts?.['where-he-is']).toBeDefined();
    expect('settings' in (fitted.facts ?? {})).toBe(false);
    expect(fitted.catalogue?.every((c) => c.tell === undefined)).toBe(true);
  });

  it('keeps no more of the client’s part than the room it leaves: the catalogue goes, then the facts', async () => {
    const { plain, built } = await padded(5500);
    const fitted = fitHistory(built, 0, 'rom.8@1');
    expect(fitted.history).toEqual(plain.history);
    expect(fitted.catalogue).toBeUndefined();
    const { plain: tight, built: tightest } = await padded(8700);
    const none = fitHistory(tightest, 0, 'rom.8@1');
    expect(none.facts).toBeUndefined();
    expect(none.history).toEqual(tight.history);
  });

  it('a request the cap is full of loses the client’s part before a word of his text or a turn', async () => {
    const built = await withTutorFacts(fields(), 6);
    const long = { ...built, history: Array.from({ length: 10 }, (_, i) => turn(i, 'x'.repeat(2500))) };
    const fitted = fitHistory(long, 0, 'rom.8@1');
    expect(size(fitted)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    // the same request without the client's part is cut exactly the same
    const without: TalkRequest = { ...long };
    delete without.facts;
    delete without.catalogue;
    expect(fitted).toEqual(fitHistory(without, 0, 'rom.8@1'));
  });
});
