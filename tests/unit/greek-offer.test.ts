// The tutor offers the Greek gently (mw-yrmkdf.4, docs/ask-tutor.md 'The Greek offer'): to a reader not learning it the tutor answers in English and, on real interest in the
// original, leaves ONE greek_offer {kind, text, lemma?} that the app draws as a button; a tap opens the Greek word's sheet or switches the view to Greek; a no is written to
// the memory index ('said no to the Greek offer <date>') and nothing more is offered until he asks for Greek himself, which clears the line.
// features/greek-offer.feature runs the whole turn against a fake Postern.
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { addTurn, getReaderView, listTurns } from '../../src/data/repositories';
import { appendToIndex, getIndex, GREEK_NO_PREFIX, greekNoLine, hasGreekNo } from '../../src/data/repositories/memory';
import { learnerMemory } from '../../src/data/learnerMemory';
import { buildTalkRequest, isTalkAnswer, type TalkScope } from '../../src/services/talk';
import { greekOfferOf, registerGreekWordOpener, takeGreekOffer } from '../../src/talk/greekOffer';
import { applyMemoryFromAnswer } from '../../src/talk/memoryUpdate';
import { offerOfTurn, pendingOfferOf, settleOffer } from '../../src/talk/offers';
import { validate, type Schema } from '../support/schema-validate';
import { instructionsOf } from '../../scripts/grind-parts';

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
  it('on a view offer switches the reader to the Greek view and marks the turn taken', async () => {
    const turn = await turnWith({ ...none, greekOffer: VIEW_OFFER });
    expect(await getReaderView()).toBe('english');
    await takeGreekOffer(turn);
    expect(await getReaderView()).toBe('greek');
    expect((await db.talks.get(turn.id!))?.greekChoice).toBe('taken');
  });

  it('on a word offer asks the Talk sheet to open the Greek word, and leaves the view alone', async () => {
    const turn = await turnWith({ ...none, greekOffer: WORD_OFFER });
    const opened: string[] = [];
    const unregister = registerGreekWordOpener((lemma) => opened.push(lemma));
    await takeGreekOffer(turn);
    unregister();
    expect(opened).toEqual(['ἀγαπάω']);
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

  it('is none for an answer with none', () => {
    expect(greekOfferOf(good, scope, [], '')).toBeUndefined();
  });
});

describe('the grind', () => {
  const instructions = instructionsOf('bible-talk');
  const verseAsk = instructionsOf('verse-ask');

  it('says when to answer in English, when to offer, and the three limits', () => {
    expect(instructions).toContain('## Offering the Greek');
    for (const rule of ['`greek_offer`', '`reader_view`', '`greek_asked`', 'at most one', 'said no to the Greek offer', 'no Greek words unless he asks']) expect(instructions).toContain(rule);
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
