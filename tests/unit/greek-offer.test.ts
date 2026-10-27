// The tutor offers the Greek gently (mw-yrmkdf.4, docs/ask-tutor.md 'The Greek offer'): to a reader not learning it the tutor answers in English and, on real interest in the
// original, leaves ONE greek_offer {kind, text, lemma?} that the app draws as a button; a tap opens the Greek word's sheet or switches the view to Greek; a no is written to
// the memory index ('said no to the Greek offer <date>') and nothing more is offered until he asks for Greek himself, which clears the line.
// features/greek-offer.feature runs the whole turn against a fake Postern.
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { addTurn, getGreekInterest, getHebrewInterest, getReaderView, getWeave, listTurns, setGreekInterest, setHebrewInterest } from '../../src/data/repositories';
import { appendToIndex, getIndex, GREEK_NO_PREFIX, greekNoLine, hasGreekNo, hasOfferNo, HEBREW_NO_PREFIX, offerNoLine } from '../../src/data/repositories/memory';
import { learnerMemory } from '../../src/data/learnerMemory';
import { NO_CHAPTER } from '../../src/data/chapter';
import { buildTalkRequest, isTalkAnswer, type TalkScope } from '../../src/services/talk';
import { chapterOfferLang, greekOfferOf, offerLangOf, registerGreekWordOpener, takeGreekOffer } from '../../src/talk/greekOffer';
import { applyMemoryFromAnswer } from '../../src/talk/memoryUpdate';
import { offerOfTurn, pendingOfferOf, settleOffer } from '../../src/talk/offers';
import { validate, type Schema } from '../support/schema-validate';
import { instructionsOf } from '../../scripts/grind-parts';
import { GREEK_LEVELS } from '../../src/settings/definitions/greekInterest';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await Promise.all([db.settings.clear(), db.talks.clear()]);
});

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const scope: TalkScope = { title: 'Romans 8', chapter, verse: chapter.verses[27] };
const genesis = JSON.parse(readFileSync('public/data/gen/1.json', 'utf8')) as Chapter;
const otScope: TalkScope = { title: 'Genesis 1', chapter: genesis, verse: genesis.verses[0] };
const welcomeScope: TalkScope = { title: 'Welcome', chapter: NO_CHAPTER, verse: null, screen: { name: 'Welcome', facts: [] }, welcome: true };
const HEBREW_VIEW = { kind: 'view' as const, text: 'Want to raise the Hebrew to Curious?', lang: 'he' as const };
const inputSchema = JSON.parse(readFileSync('grinds/bible-talk.input.schema.json', 'utf8')) as Schema;
const answerSchema = JSON.parse(readFileSync('grinds/bible-talk.answer.schema.json', 'utf8')) as Schema;
const good = { answer: 'It means to love.', question: 'What does it say?', words: [] };
const WORD_OFFER = { kind: 'word' as const, text: 'Want to see the Greek word?', lemma: 'ἀγαπάω' };
const VIEW_OFFER = { kind: 'view' as const, text: 'Want to read this verse in Greek?' };
const none = { changes: [], refused: [] };
const turnWith = async (done: Parameters<typeof addTurn>[5]) => {
  await addTurn('rom.8.28', 'q', 'a', [], Date.now(), done);
  return (await listTurns('rom.8.28')).at(-1)!;
};
const NOON = new Date('2026-10-13T12:00:00Z').getTime();
const request = (q: string) => buildTalkRequest(scope, q, [], []);

describe('the answer', () => {
  it('may carry a greek_offer, in both the schema and isTalkAnswer', () => {
    for (const offer of [WORD_OFFER, VIEW_OFFER]) {
      const value = { ...good, greek_offer: offer };
      expect(validate(value, answerSchema)).toEqual([]);
      expect(isTalkAnswer(value)).toBe(true);
    }
  });

  it('refuses a greek_offer of another kind, with no text, with an extra field or a word with no lemma', () => {
    for (const offer of [{ kind: 'sound', text: 'x' }, { kind: 'view' }, { ...VIEW_OFFER, extra: 1 }, { kind: 'word', text: 'Want the Greek word?' }]) {
      const value = { ...good, greek_offer: offer };
      expect(validate(value, answerSchema)).not.toEqual([]);
      expect(isTalkAnswer(value)).toBe(false);
    }
  });

  it('may say greek_asked: true, and nothing else', () => {
    expect(validate({ ...good, greek_asked: true }, answerSchema)).toEqual([]);
    expect(isTalkAnswer({ ...good, greek_asked: true })).toBe(true);
    expect(isTalkAnswer({ ...good, greek_asked: false })).toBe(false);
  });
});

describe('the offer a turn holds', () => {
  it('is the Greek offer text as a button until a tap or a no settles it', async () => {
    const turn = await turnWith({ ...none, greekOffer: VIEW_OFFER });
    expect(offerOfTurn(turn)).toEqual({ kind: 'greek', text: VIEW_OFFER.text, lang: 'grc' });
    expect(offerOfTurn({ ...turn, greekChoice: 'taken' })).toBeUndefined();
    expect(offerOfTurn({ ...turn, greekChoice: 'declined' })).toBeUndefined();
  });
});

describe('a tap', () => {
  it('on a view offer raises the Greek dial one step through the dial, leaves the view and the Weave to it, and marks the turn taken', async () => {
    await setGreekInterest(0);
    const turn = await turnWith({ ...none, greekOffer: { ...VIEW_OFFER, to: 1 } });
    await takeGreekOffer(turn);
    expect(await getGreekInterest()).toBe(1);
    expect(await getReaderView()).toBe('english');
    expect(await getWeave()).toBe('off');
    expect((await db.talks.get(turn.id!))?.greekChoice).toBe('taken');
  });

  it('raises by one step from where the dial stands now when the offer was stored with no step, and never lowers it', async () => {
    await setGreekInterest(2);
    await takeGreekOffer(await turnWith({ ...none, greekOffer: VIEW_OFFER }));
    expect(await getGreekInterest()).toBe(3);
    await setGreekInterest(4);
    await takeGreekOffer(await turnWith({ ...none, greekOffer: { ...VIEW_OFFER, to: 3 } }));
    expect(await getGreekInterest()).toBe(4);
  });

  it('changes the Reader only through the dial: greekOffer.ts sets neither the view nor the Weave itself', () => {
    const source = readFileSync('src/talk/greekOffer.ts', 'utf8');
    expect(source).not.toMatch(/\bsetReaderView\b|\bsetWeave\b/);
    expect(source).toContain('raiseGreekInterest');
  });

  it('on a word offer raises the dial one step, asks the Talk sheet to open the Greek word, and leaves the view alone', async () => {
    await setGreekInterest(0);
    const turn = await turnWith({ ...none, greekOffer: { ...WORD_OFFER, to: 1 } });
    const opened: string[] = [];
    const unregister = registerGreekWordOpener((lemma) => opened.push(lemma));
    await takeGreekOffer(turn);
    unregister();
    expect(opened).toEqual(['ἀγαπάω']);
    expect(await getGreekInterest()).toBe(1);
    expect(await getReaderView()).toBe('english');
    expect((await db.talks.get(turn.id!))?.greekChoice).toBe('taken');
  });
});

describe('a no', () => {
  it('appends "said no to the Greek offer <date>" to the index, once, and marks the turn declined', async () => {
    const turn = await turnWith({ ...none, greekOffer: WORD_OFFER });
    await appendToIndex('likes short answers', 'tutor');
    await settleOffer('decline', pendingOfferOf([turn]), scope, NOON);
    const index = (await getIndex()).text;
    expect(index).toContain('likes short answers');
    expect(index).toContain('said no to the Greek offer 2026-10-13');
    expect((await db.talks.get(turn.id!))?.greekChoice).toBe('declined');
    await settleOffer('decline', { turn, offer: { kind: 'greek', text: WORD_OFFER.text } }, scope, NOON);
    expect(index.split(GREEK_NO_PREFIX)).toHaveLength(2);
    expect((await getIndex()).text.split(GREEK_NO_PREFIX)).toHaveLength(2);
  });

  it('is carried by the next request, whose index holds the line', async () => {
    const turn = await turnWith({ ...none, greekOffer: VIEW_OFFER });
    await settleOffer('decline', pendingOfferOf([turn]), scope, NOON);
    const memory = await learnerMemory('Romans 8:28');
    expect(memory?.index).toContain(greekNoLine(NOON));
    const request = buildTalkRequest(scope, 'what is this?', [], [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, 'modern', false, memory, undefined, 'english');
    expect(request.memory?.index).toContain('said no to the Greek offer 2026-10-13');
    expect(request.reader_view).toBe('english');
    expect(validate(request, inputSchema)).toEqual([]);
  });

  it('is cleared by an answer that says greek_asked, and by nothing else', async () => {
    await appendToIndex('likes short answers', 'tutor');
    await appendToIndex(greekNoLine(NOON), 'tutor');
    expect(hasGreekNo((await getIndex()).text)).toBe(true);
    await applyMemoryFromAnswer({ memory_update: [{ name: 'index', append: 'prefers mornings' }] });
    expect(hasGreekNo((await getIndex()).text)).toBe(true);
    await applyMemoryFromAnswer({ greek_asked: true });
    const after = (await getIndex()).text;
    expect(hasGreekNo(after)).toBe(false);
    expect(after).toContain('likes short answers');
    expect(after).toContain('prefers mornings');
  });
});

describe('which greek_offer is kept', () => {
  it('keeps the first one of a talk and drops any after it', async () => {
    const earlier = await turnWith({ ...none, greekOffer: VIEW_OFFER });
    expect(greekOfferOf({ ...good, greek_offer: VIEW_OFFER }, scope, [], '')).toEqual(VIEW_OFFER);
    expect(greekOfferOf({ ...good, greek_offer: VIEW_OFFER }, scope, [earlier], '')).toBeUndefined();
  });

  it('drops one when the index already holds his no', () => {
    expect(greekOfferOf({ ...good, greek_offer: VIEW_OFFER }, scope, [], `likes short answers\n${greekNoLine(NOON)}`)).toBeUndefined();
  });

  it('drops a word offer for a word the text does not have, and keeps one the text has', () => {
    expect(greekOfferOf({ ...good, greek_offer: { kind: 'word', text: 'x', lemma: 'ζζζ' } }, scope, [], '')).toBeUndefined();
    expect(greekOfferOf({ ...good, greek_offer: WORD_OFFER }, scope, [], '')).toEqual(WORD_OFFER);
  });

  it('names the one step up the dial in the offer it keeps, never more, and none above All in', () => {
    for (const level of [0, 1, 2, 3, 4] as const) expect(greekOfferOf({ ...good, greek_offer: VIEW_OFFER }, scope, [], '', false, level)?.to).toBe(level + 1);
    expect(greekOfferOf({ ...good, greek_offer: VIEW_OFFER }, scope, [], '', false, 5)).toBeUndefined();
    expect(greekOfferOf({ ...good, greek_offer: VIEW_OFFER }, scope, [], '')?.to).toBeUndefined();
  });

  it('is none for an answer with none', () => {
    expect(greekOfferOf(good, scope, [], '')).toBeUndefined();
  });
});

describe('the grind', () => {
  const instructions = instructionsOf('bible-talk');
  const verseAsk = instructionsOf('verse-ask');

  it('says when to answer in English, when to offer, and the three limits', () => {
    expect(instructions).toContain('## Offering the Greek');
    for (const rule of ['`greek_offer`', '`greek_interest`', '`greek_asked`', 'at most one', 'said no to the Greek offer', 'no Greek words unless he asks']) expect(instructions).toContain(rule);
    expect(instructions).toContain('`greek`');
  });

  it('is repeated for verse-ask, which answers in English and leaves no offer', () => {
    expect(verseAsk).toContain('## English for a reader not learning the Greek');
    expect(verseAsk).toContain('said no to the Greek offer');
  });

  it('has examples: an English-only reader is offered once, one who said no is not, a learner of the Greek is not held to English', () => {
    const read = (file: string) =>
      JSON.parse(readFileSync(`grinds/examples/bible-talk/${file}.json`, 'utf8')) as { request: { reader_view?: string; memory?: { index: string } }; expect: Record<string, { present?: boolean; equals?: string }> };
    const offered = read('greek-offer-word-meaning');
    expect(offered.request.reader_view).toBe('english');
    expect(offered.expect['greek_offer.kind'].equals).toBe('word');
    const refused = read('greek-offer-after-no');
    expect(refused.request.memory?.index).toContain('said no to the Greek offer');
    expect(refused.expect.greek_offer.present).toBe(false);
    const learner = read('greek-offer-learner');
    expect(learner.request.reader_view).toBe('greek');
    expect(learner.expect.greek_offer.present).toBe(false);
  });
});

describe('an answer that takes his no', () => {
  it('keeps no greek_offer of its own', () => {
    expect(greekOfferOf({ ...good, greek_offer: VIEW_OFFER }, scope, [], '', true)).toBeUndefined();
  });
});

describe('the request', () => {
  const request = (settings: Record<string, string>, s: TalkScope = scope) =>
    buildTalkRequest(s, 'what is this?', [], [], settings, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, 'modern', false, undefined, undefined, 'english');

  it('carries greek_interest: the dial\'s step, its name and the next step up, valid against the input schema', () => {
    for (const step of GREEK_LEVELS) {
      const built = request({ greekInterest: String(step.level) });
      const next = GREEK_LEVELS[step.level + 1];
      expect(built.greek_interest).toEqual({ level: step.level, name: step.name, ...(next ? { next: { level: next.level, name: next.name } } : {}) });
      expect(validate(built, inputSchema)).toEqual([]);
    }
  });

  it('reads an unplaced phone as All in, with no next step', () => {
    expect(request({}).greek_interest).toEqual({ level: 5, name: 'All in' });
  });

  it('leaves greek_interest out of a quiz and a talk from a screen, as it does reader_view', () => {
    expect(request({ greekInterest: '0' }, { ...scope, quiz: true }).greek_interest).toBeUndefined();
    expect(request({ greekInterest: '0' }, { ...scope, screen: { name: 'Words' } } as TalkScope).greek_interest).toBeUndefined();
  });

  it('describes greek_interest in the input schema', () => {
    const props = (inputSchema as unknown as { properties: Record<string, unknown> }).properties;
    expect(props.greek_interest).toBeDefined();
  });
});

describe('the instructions on the dial', () => {
  const text = instructionsOf('bible-talk');
  const part = text.slice(text.indexOf('## Offering the Greek'));
  const offering = part.slice(0, part.indexOf('\n## ', 5) === -1 ? undefined : part.indexOf('\n## ', 5));

  it('say that at step 0 there is no Greek offer unless he asks about the Greek', () => {
    expect(offering).toContain('`greek_interest`');
    expect(offering).toMatch(/level` is 0|step 0|Just English/);
    expect(offering).toMatch(/no `greek_offer` unless he asks|no Greek offer unless he asks/);
  });

  it('say that on real interest the offer raises the dial one step, named by `next.name`, and never more than one step', () => {
    expect(offering).toContain('`next`');
    expect(offering).toMatch(/raise the dial/);
    expect(offering).toMatch(/one step/);
    expect(offering).toMatch(/never more than one step/i);
    expect(offering).toMatch(/never above/i);
  });

  it('keep a remembered no, and no offer at All in', () => {
    expect(offering).toContain('said no to the Greek offer');
    expect(offering).toMatch(/All in|no `next`/);
  });
});

describe('the dial\'s examples', () => {
  type Ex = { request: { reader_view?: string; settings: Record<string, string>; greek_interest?: { level: number; name: string; next?: { level: number; name: string } }; question: string }; expect: Record<string, { present?: boolean; equals?: string; matches?: string }> };
  const read = (file: string) => JSON.parse(readFileSync(`grinds/examples/bible-talk/${file}.json`, 'utf8')) as Ex;

  it('has one for a reader at Just English who asks what a Greek word means: answered, with one offer to step up to Curious', () => {
    const e = read('greek-dial-offer-at-zero');
    expect(e.request.greek_interest).toEqual({ level: 0, name: 'Just English', next: { level: 1, name: 'Curious' } });
    expect(e.request.settings.greekInterest).toBe('0');
    expect(e.expect['greek_offer.text'].matches).toContain('Curious');
    expect(e.expect['greek_offer.kind']).toBeDefined();
    expect(e.expect['words.0.lemma'].equals).toBe('ἀγαπάω');
    expect(validate(e.request, inputSchema)).toEqual([]);
  });

  it('every example that expects a greek_offer in the talk (not the welcome) carries the dial in its request', () => {
    for (const file of ['greek-offer-word-meaning', 'greek-offer-example-words-only', 'greek-offer-asks-for-greek', 'greek-offer-after-no', 'greek-offer-no-thanks', 'greek-offer-learner']) {
      const e = read(file);
      expect(e.request.greek_interest, file).toBeDefined();
      expect(e.request.settings.greekInterest, file).toBe(String(e.request.greek_interest!.level));
      expect(validate(e.request, inputSchema), file).toEqual([]);
    }
  });
});

describe('the offer of the Hebrew (mw-gdcyf98.17)', () => {
  it('is a greek_offer with a lang, optional, that the schema and isTalkAnswer take: grc, he or both, nothing else', () => {
    for (const offer of [HEBREW_VIEW, { ...VIEW_OFFER, lang: 'grc' }, { ...VIEW_OFFER, lang: 'both' }, { ...WORD_OFFER, lang: 'grc' }]) {
      const value = { ...good, greek_offer: offer };
      expect(validate(value, answerSchema), JSON.stringify(offer)).toEqual([]);
      expect(isTalkAnswer(value), JSON.stringify(offer)).toBe(true);
    }
    for (const offer of [{ ...VIEW_OFFER, lang: 'fr' }, { ...VIEW_OFFER, lang: 'he', extra: 1 }]) {
      const value = { ...good, greek_offer: offer };
      expect(validate(value, answerSchema)).not.toEqual([]);
      expect(isTalkAnswer(value)).toBe(false);
    }
  });

  it('reads an offer without lang as Greek: every old answer and example still reads', () => {
    expect(offerLangOf(VIEW_OFFER)).toBe('grc');
    expect(offerLangOf(HEBREW_VIEW)).toBe('he');
    expect(greekOfferOf({ ...good, greek_offer: VIEW_OFFER }, scope, [], '', false, 1)).toEqual({ ...VIEW_OFFER, to: 2 });
    // an Old Testament chapter picks the Hebrew dial: an offer with no lang is a Greek one and is not kept there
    expect(greekOfferOf({ ...good, greek_offer: VIEW_OFFER }, otScope, [], '', false, 0)).toBeUndefined();
  });

  it('is made to a reader at Hebrew 0 on an Old Testament chapter, to Curious', () => {
    expect(chapterOfferLang(otScope)).toBe('he');
    expect(chapterOfferLang(scope)).toBe('grc');
    expect(greekOfferOf({ ...good, greek_offer: HEBREW_VIEW }, otScope, [], '', false, 0)).toEqual({ ...HEBREW_VIEW, to: 1 });
  });

  it('is a one-step offer on the Hebrew dial at Curious and above, and none at All in', () => {
    for (const level of [1, 2, 3, 4] as const) expect(greekOfferOf({ ...good, greek_offer: HEBREW_VIEW }, otScope, [], '', false, level)?.to).toBe(level + 1);
    expect(greekOfferOf({ ...good, greek_offer: HEBREW_VIEW }, otScope, [], '', false, 5)).toBeUndefined();
  });

  it('is not made on a New Testament chapter, nor a Greek one on an Old Testament chapter', () => {
    expect(greekOfferOf({ ...good, greek_offer: HEBREW_VIEW }, scope, [], '', false, 0)).toBeUndefined();
    expect(greekOfferOf({ ...good, greek_offer: { ...VIEW_OFFER, lang: 'grc' } }, otScope, [], '', false, 0)).toBeUndefined();
  });

  it('is kept once a talk, and not after a no said to the Hebrew offer, while the Greek offer on a New Testament chapter still is', () => {
    const noHebrew = `likes short answers\n${offerNoLine(NOON, 'he')}`;
    expect(noHebrew).toContain('said no to the Hebrew offer 2026-10-13');
    expect(hasOfferNo(noHebrew, 'he')).toBe(true);
    expect(hasOfferNo(noHebrew, 'grc')).toBe(false);
    expect(greekOfferOf({ ...good, greek_offer: HEBREW_VIEW }, otScope, [], noHebrew, false, 0)).toBeUndefined();
    expect(greekOfferOf({ ...good, greek_offer: VIEW_OFFER }, scope, [], noHebrew, false, 0)).toEqual({ ...VIEW_OFFER, to: 1 });
    // and the other way: a Greek no leaves the Hebrew offer
    expect(greekOfferOf({ ...good, greek_offer: HEBREW_VIEW }, otScope, [], greekNoLine(NOON), false, 0)).toEqual({ ...HEBREW_VIEW, to: 1 });
  });

  it('shows as a pending offer of kind greek with its lang', async () => {
    const turn = await turnWith({ ...none, greekOffer: { ...HEBREW_VIEW, to: 1 } });
    expect(offerOfTurn(turn)).toEqual({ kind: 'greek', text: HEBREW_VIEW.text, lang: 'he' });
    expect(validate({ ...request('a'), pending_offer: offerOfTurn(turn) }, inputSchema)).toEqual([]);
  });

  it('on a tap raises the Hebrew dial and not the Greek one', async () => {
    await setGreekInterest(0);
    await setHebrewInterest(0);
    const turn = await turnWith({ ...none, greekOffer: { ...HEBREW_VIEW, to: 1 } });
    await takeGreekOffer(turn);
    expect(await getHebrewInterest()).toBe(1);
    expect(await getGreekInterest()).toBe(0);
    expect((await db.talks.get(turn.id!))?.greekChoice).toBe('taken');
  });

  it('on a tap with no step raises the Hebrew dial one step from where it stands, and never lowers it', async () => {
    await setHebrewInterest(2);
    await takeGreekOffer(await turnWith({ ...none, greekOffer: { kind: 'view', text: 'x', lang: 'he' } }));
    expect(await getHebrewInterest()).toBe(3);
    await takeGreekOffer(await turnWith({ ...none, greekOffer: { ...HEBREW_VIEW, to: 1 } }));
    expect(await getHebrewInterest()).toBe(3);
  });

  it('on a no writes "said no to the Hebrew offer <date>" and no Greek line', async () => {
    const turn = await turnWith({ ...none, greekOffer: HEBREW_VIEW });
    await settleOffer('decline', pendingOfferOf([turn]), otScope, NOON);
    const index = (await getIndex()).text;
    expect(index).toContain(`${HEBREW_NO_PREFIX} 2026-10-13`);
    expect(index).not.toContain(GREEK_NO_PREFIX);
    expect((await db.talks.get(turn.id!))?.greekChoice).toBe('declined');
  });

  it('greek_asked clears the line of the chapter\'s language only', async () => {
    await appendToIndex(greekNoLine(NOON), 'tutor');
    await appendToIndex(offerNoLine(NOON, 'he'), 'tutor');
    await applyMemoryFromAnswer({ greek_asked: true }, NOON, 'he');
    expect(hasOfferNo((await getIndex()).text, 'he')).toBe(false);
    expect(hasOfferNo((await getIndex()).text, 'grc')).toBe(true);
    await applyMemoryFromAnswer({ greek_asked: true }, NOON);
    expect(hasGreekNo((await getIndex()).text)).toBe(false);
  });

  it('is the request\'s own: reader_view is hebrew on a Hebrew chapter in its original, and hebrew_interest names its dial', () => {
    const built = buildTalkRequest(otScope, 'what is this?', [], [], { greekInterest: '0', hebrewInterest: '0' }, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, 'modern', false, undefined, undefined, 'greek');
    expect(built.reader_view).toBe('hebrew');
    expect(built.hebrew_interest).toEqual({ level: 0, name: 'Just English', next: { level: 1, name: 'Curious' } });
    expect(validate(built, inputSchema)).toEqual([]);
    const english = buildTalkRequest(otScope, 'what is this?', [], [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, 'modern', false, undefined, undefined, 'english');
    expect(english.reader_view).toBe('english');
  });
});

describe('the welcome\'s offer (mw-gdcyf98.17)', () => {
  const WELCOME = (lang: 'grc' | 'he' | 'both', text: string) => ({ ...good, greek_offer: { kind: 'view' as const, text, lang } });

  it('keeps the offer of the Greek, of the Hebrew, or of both, once, at Dipping a toe', () => {
    for (const [lang, text] of [['grc', 'Show me the Greek'], ['he', 'Show me the Hebrew'], ['both', 'Show me the Greek and the Hebrew']] as const) {
      expect(validate(WELCOME(lang, text), answerSchema)).toEqual([]);
      expect(greekOfferOf(WELCOME(lang, text), welcomeScope, [], '')).toEqual({ kind: 'view', text, lang, to: 2 });
    }
  });

  it('on a tap raises the named dial(s) to Dipping a toe', async () => {
    await setGreekInterest(0);
    await setHebrewInterest(0);
    await takeGreekOffer(await turnWith({ ...none, greekOffer: { kind: 'view', text: 'Show me the Hebrew', lang: 'he', to: 2 } }));
    expect([await getGreekInterest(), await getHebrewInterest()]).toEqual([0, 2]);
    await setHebrewInterest(0);
    await takeGreekOffer(await turnWith({ ...none, greekOffer: { kind: 'view', text: 'Show me the Greek and the Hebrew', lang: 'both', to: 2 } }));
    expect([await getGreekInterest(), await getHebrewInterest()]).toEqual([2, 2]);
    await setGreekInterest(0);
    await setHebrewInterest(0);
    await takeGreekOffer(await turnWith({ ...none, greekOffer: { kind: 'view', text: 'Show me the Greek', lang: 'grc', to: 2 } }));
    expect([await getGreekInterest(), await getHebrewInterest()]).toEqual([2, 0]);
  });
});

describe('the Hebrew instructions and examples', () => {
  const text = instructionsOf('bible-talk');
  const offering = text.slice(text.indexOf('## Offering the Greek'), text.indexOf('\n## ', text.indexOf('## Offering the Greek') + 5));

  it('keep the heading and the eight-line list, name `hebrew_interest`, `lang` and the Hebrew no, and read the original language-neutrally', () => {
    expect(offering).toContain('## Offering the Greek');
    expect(offering).toContain('`hebrew_interest`');
    expect(offering).toContain('`lang`');
    expect(offering).toContain('said no to the Hebrew offer');
    expect(offering).toMatch(/`reader_view` is `greek` or `hebrew`/);
    expect(offering.match(/^[1-8]\. /gm)).toHaveLength(8);
  });

  it('say the welcome asks the new first question and names the three answers', () => {
    const start = text.indexOf('## The welcome');
    const welcome = text.slice(start, text.indexOf('\n## ', start + 1)).replace(/\s+/g, ' ');
    expect(welcome).toContain("'Why are you here: to read, to study, or to learn the Greek or the Hebrew?'");
    for (const line of ["'Show me the Greek'", "'Show me the Hebrew'", "'Show me the Greek and the Hebrew'"]) expect(welcome).toContain(line);
  });

  it('let verse-ask make no offer on an Old Testament verse', () => {
    const ask = instructionsOf('verse-ask');
    expect(ask).toContain('make no offer: the Bible talk makes them');
    expect(ask).not.toContain('offer no Greek');
  });

  it('have a Hebrew offer on Genesis 1:1 and a welcome answer for the Hebrew, both fitting the schemas', () => {
    const read = (file: string) => JSON.parse(readFileSync(`grinds/examples/bible-talk/${file}.json`, 'utf8')) as { request: Record<string, unknown> & { hebrew_interest?: { level: number } }; expect: Record<string, { equals?: string; matches?: string }> };
    const genesis = read('hebrew-offer-on-genesis');
    expect(genesis.request.hebrew_interest?.level).toBe(0);
    expect(genesis.expect['greek_offer.lang'].equals).toBe('he');
    expect(genesis.expect['greek_offer.text'].matches).toContain('Curious');
    const welcome = read('welcome-learn-hebrew');
    expect(welcome.expect['greek_offer.lang'].equals).toBe('he');
    expect(welcome.expect['greek_offer.text'].matches).toContain('Hebrew');
    for (const e of [genesis, welcome]) expect(validate(e.request, inputSchema)).toEqual([]);
  });
});
