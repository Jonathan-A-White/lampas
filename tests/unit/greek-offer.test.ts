// The tutor offers the Greek gently (mw-yrmkdf.4, docs/ask-tutor.md 'The Greek offer'): to a reader not learning it the tutor answers in English and, on real interest in the
// original, leaves ONE greek_offer {kind, text, lemma?} that the app draws as a button; a tap opens the Greek word's sheet or switches the view to Greek; a no is written to
// the memory index ('said no to the Greek offer <date>') and nothing more is offered until he asks for Greek himself, which clears the line.
// features/greek-offer.feature runs the whole turn against a fake Postern.
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { addTurn, getGreekInterest, getReaderView, getWeave, listTurns, setGreekInterest } from '../../src/data/repositories';
import { appendToIndex, getIndex, GREEK_NO_PREFIX, greekNoLine, hasGreekNo } from '../../src/data/repositories/memory';
import { learnerMemory } from '../../src/data/learnerMemory';
import { buildTalkRequest, isTalkAnswer, type TalkScope } from '../../src/services/talk';
import { greekOfferOf, registerGreekWordOpener, takeGreekOffer } from '../../src/talk/greekOffer';
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
    expect(offerOfTurn(turn)).toEqual({ kind: 'greek', text: VIEW_OFFER.text });
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
