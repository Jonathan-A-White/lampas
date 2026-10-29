// Answering an offer by voice (mw-5r3p30.186): the offers a turn holds for his tap, the request that carries the newest one, the answer's
// setting_offer and offer_reply, and what a reply does to each kind of offer. The decision itself is the grind's; features/voice-offers.feature
// runs the whole turn against a fake Postern.
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { addTurn, getQuizGoal, listTurns } from '../../src/data/repositories';
import { buildTalkRequest, isTalkAnswer, type PendingOffer, type TalkScope } from '../../src/services/talk';
import { offeredChange } from '../../src/settings/registry';
import { offerOfTurn, pendingOfferOf, settleOffer } from '../../src/talk/offers';
import { validate, type Schema } from '../support/schema-validate';
import { instructionsOf } from '../../scripts/grind-parts';
import '../support/grinds-in-graph';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await Promise.all([db.settings.clear(), db.talks.clear()]);
});

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const scope: TalkScope = { title: 'Romans 8', chapter, verse: chapter.verses[10], quiz: true };
const inputSchema = JSON.parse(readFileSync('grinds/bible-talk.input.schema.json', 'utf8')) as Schema;
const answerSchema = JSON.parse(readFileSync('grinds/bible-talk.answer.schema.json', 'utf8')) as Schema;
const good = { answer: 'Done.', question: 'What does it say?', words: [] };
const turnWith = async (done: Parameters<typeof addTurn>[5]) => {
  await addTurn('rom.8.11:quiz', 'q', 'a', [], Date.now(), done);
  return (await listTurns('rom.8.11:quiz')).at(-1)!;
};
const none = { changes: [], refused: [] };

describe('the offer a turn holds', () => {
  it('is the makers first, then the setting, then the quiz goal, and none once it is settled', async () => {
    const turn = await turnWith({ ...none, feedbackOffer: 'He wants X.', settingOffer: { key: 'theme', value: 'dark' }, quizGoalOffer: 'learning Greek' });
    expect(offerOfTurn(turn)).toEqual({ kind: 'feedback', text: 'He wants X.' });
    expect(offerOfTurn({ ...turn, feedbackSent: true })).toEqual({ kind: 'setting', text: 'Change Theme: Dark' });
    expect(offerOfTurn({ ...turn, feedbackWithdrawn: true, settingChoice: 'declined' })).toEqual({ kind: 'quiz-goal', text: 'learning Greek' });
    expect(offerOfTurn({ ...turn, feedbackSent: true, settingChoice: 'taken', quizGoalChoice: 'declined' })).toBeUndefined();
  });

  it('is the newest turn with an offer still waiting', async () => {
    await turnWith({ ...none, feedbackOffer: 'old' });
    await new Promise((r) => setTimeout(r, 2));
    const newer = await turnWith({ ...none, quizGoalOffer: 'learning English' });
    await new Promise((r) => setTimeout(r, 2));
    await turnWith(none);
    const found = pendingOfferOf(await listTurns('rom.8.11:quiz'));
    expect(found?.turn.id).toBe(newer.id);
    expect(found?.offer).toEqual({ kind: 'quiz-goal', text: 'learning English' });
  });
});

describe('an offer he already took, whose button stays on screen', () => {
  it('still counts for a yes on the newest turn, but not on an older one, nor after his no', async () => {
    const greek = { kind: 'word' as const, text: 'Hear it in Greek', lemma: 'λόγος' };
    const turn = await turnWith({ ...none, greekOffer: greek });
    expect(pendingOfferOf([turn])?.offer.kind).toBe('greek');
    const taken = { ...turn, greekChoice: 'taken' as const };
    expect(pendingOfferOf([taken])?.offer).toEqual({ kind: 'greek', text: 'Hear it in Greek', lang: 'grc' });
    expect(pendingOfferOf([taken, { ...taken, id: 99, greekOffer: undefined, greekChoice: undefined }])).toBeUndefined();
    expect(pendingOfferOf([{ ...taken, greekChoice: 'declined' }])).toBeUndefined();
  });
});

describe('the request', () => {
  const offer: PendingOffer = { kind: 'feedback', text: 'He wants X.' };
  const request = (pending?: PendingOffer) => buildTalkRequest(scope, 'yes', [], [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, pending);

  it('carries the pending offer when there is one, and the input schema allows it', () => {
    expect(request(offer).pending_offer).toEqual(offer);
    expect('pending_offer' in request()).toBe(false);
    expect(validate(request(offer), inputSchema)).toEqual([]);
    expect(validate({ ...request(offer), pending_offer: { kind: 'other', text: 'x' } }, inputSchema)).not.toEqual([]);
  });
});

describe('the answer', () => {
  it.each(['confirm', 'decline', 'read_back'])('may say offer_reply %s, in both the schema and isTalkAnswer', (reply) => {
    const value = { ...good, offer_reply: reply };
    expect(validate(value, answerSchema)).toEqual([]);
    expect(isTalkAnswer(value)).toBe(true);
  });

  it('refuses another offer_reply and a setting_offer that is not a key and a value', () => {
    for (const value of [{ ...good, offer_reply: 'maybe' }, { ...good, setting_offer: { key: 'theme' } }, { ...good, setting_offer: { key: 'theme', value: 'dark', extra: 1 } }]) {
      expect(validate(value, answerSchema)).not.toEqual([]);
      expect(isTalkAnswer(value)).toBe(false);
    }
    const ok = { ...good, setting_offer: { key: 'theme', value: 'dark' } };
    expect(validate(ok, answerSchema)).toEqual([]);
    expect(isTalkAnswer(ok)).toBe(true);
  });

  it('keeps only a setting offer the registry would take', () => {
    expect(offeredChange({ key: 'theme', value: 'dark' })).toMatchObject({ key: 'theme', value: 'dark', text: 'Change Theme: Dark' });
    for (const bad of [{ key: 'theme', value: 'purple' }, { key: 'nonsense', value: 'x' }, { key: 'theme' }, 'x', null]) expect(offeredChange(bad)).toBeUndefined();
  });
});

describe('what a reply does to the waiting offer', () => {
  it('a confirm of the quiz goal keeps it and marks the turn kept', async () => {
    const turn = await turnWith({ ...none, quizGoalOffer: 'learning Greek' });
    const outcome = await settleOffer('confirm', pendingOfferOf([turn]), scope);
    expect(outcome).toEqual({ applied: [], refused: [] });
    expect(await getQuizGoal()).toBe('learning Greek');
    expect((await db.talks.get(turn.id!))?.quizGoalChoice).toBe('kept');
  });

  it('a decline of the quiz goal keeps nothing and marks the turn declined', async () => {
    const turn = await turnWith({ ...none, quizGoalOffer: 'learning Greek' });
    await settleOffer('decline', pendingOfferOf([turn]), scope);
    expect(await getQuizGoal()).toBe('');
    expect((await db.talks.get(turn.id!))?.quizGoalChoice).toBe('declined');
  });

  it('a read back, no reply and no waiting offer change nothing', async () => {
    const turn = await turnWith({ ...none, quizGoalOffer: 'learning Greek' });
    await settleOffer('read_back', pendingOfferOf([turn]), scope);
    await settleOffer(undefined, pendingOfferOf([turn]), scope);
    await settleOffer('confirm', undefined, scope);
    expect(await getQuizGoal()).toBe('');
    expect((await db.talks.get(turn.id!))?.quizGoalChoice).toBeUndefined();
  });

  it('a confirm of a setting offer applies it with the change Undo needs, and a decline withdraws it', async () => {
    const first = await turnWith({ ...none, settingOffer: { key: 'theme', value: 'dark' } });
    const outcome = await settleOffer('confirm', pendingOfferOf([first]), scope);
    expect(outcome.applied).toMatchObject([{ key: 'theme', to: 'dark', shown: 'Theme: Dark' }]);
    expect((await db.talks.get(first.id!))?.settingChoice).toBe('taken');
    const second = await turnWith({ ...none, settingOffer: { key: 'theme', value: 'light' } });
    await settleOffer('decline', pendingOfferOf([second]), scope);
    expect((await db.talks.get(second.id!))?.settingChoice).toBe('declined');
    expect((await db.settings.get('theme'))?.value).toBe('dark');
  });
});

describe('a reply that lands after his tap on the same offer (mw-5r3p30.328)', () => {
  it('a yes to a setting offer he tapped applies nothing a second time', async () => {
    const turn = await turnWith({ ...none, settingOffer: { key: 'theme', value: 'dark' } });
    const waiting = pendingOfferOf([turn]);
    // his tap: the one that settles the offer, as the button does
    await settleOffer('confirm', waiting, scope);
    await db.settings.put({ key: 'theme', value: 'light' });
    const late = await settleOffer('confirm', waiting, scope);
    expect(late).toEqual({ applied: [], refused: [] });
    expect((await db.settings.get('theme'))?.value).toBe('light');
  });

  it('a no to an offer he tapped withdraws nothing he took', async () => {
    const turn = await turnWith({ ...none, settingOffer: { key: 'theme', value: 'dark' } });
    const waiting = pendingOfferOf([turn]);
    await settleOffer('confirm', waiting, scope);
    await settleOffer('decline', waiting, scope);
    expect((await db.talks.get(turn.id!))?.settingChoice).toBe('taken');
  });

  it('a yes to the quiz goal he chose Just this time does not keep it as his goal', async () => {
    const turn = await turnWith({ ...none, quizGoalOffer: 'learning Greek' });
    const waiting = pendingOfferOf([turn]);
    await db.talks.update(turn.id!, { quizGoalChoice: 'once' });
    await settleOffer('confirm', waiting, scope);
    expect(await getQuizGoal()).toBe('');
    expect((await db.talks.get(turn.id!))?.quizGoalChoice).toBe('once');
  });
});

describe('the grind', () => {
  const instructions = instructionsOf('bible-talk');
  it('carries the pending offer and the three replies, and speaks the text word for word on a read back', () => {
    expect(instructions).toContain('## Answering an offer by voice');
    for (const rule of ['`pending_offer`', '`offer_reply`', '`confirm`', '`decline`', '`read_back`', 'word for word', 'yes send it', 'read it back to me', 'no', 'not now', 'Shall I do that?']) {
      expect(instructions).toContain(rule);
    }
  });

  it('has an example for yes send it, read it back to me and no not now, each with an offer pending', () => {
    for (const [file, question, reply] of [['offer-yes-send-it', 'yes send it', 'confirm'], ['offer-read-it-back', 'read it back to me', 'read_back'], ['offer-no-not-now', 'no not now', 'decline']]) {
      const example = JSON.parse(readFileSync(`grinds/examples/bible-talk/${file}.json`, 'utf8')) as { request: { question: string; pending_offer?: PendingOffer }; expect: Record<string, { equals?: string }> };
      expect(example.request.question).toBe(question);
      expect(example.request.pending_offer?.kind).toBe('feedback');
      expect(example.expect.offer_reply.equals).toBe(reply);
    }
  });
});
