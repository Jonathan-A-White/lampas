// A talk names itself to the mill (mw-pxji7y.3): `<ref>@<when of its first turn>`, so the mill keeps one session per talk. The first turn of a talk is stored
// with the very `when` its id carries, and New talk (deleteTurns) makes the next id by itself. verse-ask names no talk; a long ref is cut to the 80 bytes a name may be.
import { Utils } from '@bsv/sdk';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { addTurn, deleteTurns, listTurns, screenRef, talkRef } from '../../src/data/repositories/talks';
import { setCurrentLicence } from '../../src/services/licenceNow';
import { askTutor, buildRequest, TUTOR_KIND } from '../../src/services/tutor';
import { MAX_REQUEST_BYTES, TALK_KIND, TALK_NAME_MAX, askTalk, buildTalkRequest, fitHistory, talkNameOf } from '../../src/services/talk';
import { makeFakePostern, type FakePostern } from '../support/fake-postern';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const key = Uint8Array.from(Utils.toArray('00'.repeat(31) + '0c', 'hex'));

beforeEach(async () => {
  await db.open();
  await Promise.all([db.talks.clear(), db.talkSummaries.clear(), db.talkPictures.clear()]);
});
afterAll(() => db.close());

describe('the name of a talk', () => {
  it('for a ref with turns is <ref>@<the oldest turn\'s when>, whatever the time is now', async () => {
    await addTurn('rom.8', 'one', 'a', [], 5000);
    await addTurn('rom.8', 'two', 'a', [], 6000);
    const turns = await listTurns('rom.8');
    expect(talkNameOf('rom.8', turns, 9999)).toEqual({ talk: 'rom.8@5000', when: 5000 });
    expect(talkNameOf('rom.8', turns, 12345).talk).toBe('rom.8@5000');
  });

  it('for a ref with none is <ref>@<now>, and that now is the when the first turn is stored with', async () => {
    const { talk, when } = talkNameOf('rom.8', await listTurns('rom.8'), 7000);
    expect(talk).toBe('rom.8@7000');
    await addTurn('rom.8', 'one', 'a', [], when);
    expect(talkNameOf('rom.8', await listTurns('rom.8'), 8000).talk).toBe(talk);
  });

  it('is a new one after New talk (deleteTurns), and another ref has its own', async () => {
    await addTurn('rom.8', 'one', 'a', [], 5000);
    const before = talkNameOf('rom.8', await listTurns('rom.8'), 6000).talk;
    await deleteTurns('rom.8');
    const after = talkNameOf('rom.8', await listTurns('rom.8'), 6000).talk;
    expect(after).toBe('rom.8@6000');
    expect(after).not.toBe(before);
    expect(talkNameOf('rom.8.28', await listTurns('rom.8.28'), 6000).talk).toBe('rom.8.28@6000');
  });

  it('makes a quiz its own talk beside the talk about the same verses', async () => {
    await addTurn(talkRef('rom', 8, null), 'q', 'a', [], 5000);
    const talk = talkNameOf('rom.8', await listTurns('rom.8'), 6000).talk;
    const quizRef = talkRef('rom', 8, null, true);
    expect(quizRef).toBe('rom.8:quiz');
    const quiz = talkNameOf(quizRef, await listTurns(quizRef), 6000).talk;
    expect(quiz).toBe('rom.8:quiz@6000');
    expect(quiz).not.toBe(talk);
  });

  it('names a screen talk and a free talk by the same rule', () => {
    expect(talkNameOf(screenRef('goal'), [], 1000).talk).toBe('screen.goal@1000');
    expect(talkNameOf('talk.1790000000000', [], 1790000000500).talk).toBe('talk.1790000000000@1790000000500');
  });

  it('is never over the 80 bytes the mill takes: a long ref is cut and the time stays', () => {
    const ref = `screen.${'x'.repeat(200)}`;
    const { talk } = talkNameOf(ref, [], 1790000000000);
    expect(new TextEncoder().encode(talk).length).toBeLessThanOrEqual(TALK_NAME_MAX);
    expect(talk.endsWith('@1790000000000')).toBe(true);
    expect(TALK_NAME_MAX).toBe(80);
  });
});

describe('what a request carries to the mill', () => {
  let postern: FakePostern;
  beforeEach(() => {
    setCurrentLicence('licensed');
    postern = makeFakePostern();
    postern.autoReply = { status: 'answered', answer: { answer: 'Yes.', words: [] } };
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => postern.fetch(input, init));
  });
  afterAll(() => vi.unstubAllGlobals());

  const talkRequest = () => buildTalkRequest({ title: 'Romans 8', chapter, verse: null }, 'What is σάρξ?', [], []);

  it('a Bible talk turn carries its talk in the grist header, the same on every turn', async () => {
    await askTalk(talkRequest(), { key, talk: 'rom.8@5000' });
    await askTalk(talkRequest(), { key, talk: 'rom.8@5000' });
    expect(postern.received.map((r) => r.grist.kind)).toEqual([TALK_KIND, TALK_KIND]);
    expect(postern.received.map((r) => r.grist.talk)).toEqual(['rom.8@5000', 'rom.8@5000']);
  });

  it('a Bible talk turn given no talk carries none', async () => {
    await askTalk(talkRequest(), { key });
    expect('talk' in postern.received[0].grist).toBe(false);
  });

  it('a verse-ask request carries no talk, even when one is given', async () => {
    await askTutor(buildRequest('Romans 8:1', chapter.verses[0], 'What does this mean?', []), { key, talk: 'rom.8.1@5000' });
    expect(postern.received[0].grist.kind).toBe(TUTOR_KIND);
    expect('talk' in postern.received[0].grist).toBe(false);
  });
});

describe('the talk id counts in the request budget (fitHistory)', () => {
  const size = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;
  /** a request whose history is padded until the request is `room` bytes under the cap */
  const nearCap = (room: number) => {
    const turn = (i: number) => ({ q: `Question ${i}`, a: 'x'.repeat(120) });
    let request = buildTalkRequest({ title: 'Romans 8', chapter, verse: null }, 'What is σάρξ?', Array.from({ length: 8 }, (_, i) => turn(i)), []);
    request = { ...request, greek_words: [] };
    delete (request as Partial<typeof request>).pronunciation_guide;
    let pad = 0;
    while (size({ ...request, history: [...request.history, { q: 'pad', a: 'p'.repeat(pad) }] }) < MAX_REQUEST_BYTES - room) pad += 1;
    return { ...request, history: [{ q: 'pad', a: 'p'.repeat(pad) }, ...request.history] };
  };

  it('leaves a request that fits with the id as it was', () => {
    const request = nearCap(500);
    expect(fitHistory(request, 0, 'rom.8@1790000000000')).toEqual(request);
  });

  it('gives way for the id: a request a few bytes under the cap is cut once the id is counted, and not before', () => {
    const talk = 'rom.8@1790000000000';
    const request = nearCap(5);
    expect(size(request)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(fitHistory(request).history).toEqual(request.history);
    const fitted = fitHistory(request, 0, talk);
    expect(fitted).not.toEqual(request);
    expect(size(fitted) + new TextEncoder().encode(`,"talk":${JSON.stringify(talk)}`).length).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
  });
});
