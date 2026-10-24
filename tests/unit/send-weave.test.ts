// tests/unit/send-weave.test.ts — a Weave recall is sent to the mill's verse-read (mw-fu7dqf.7, docs/layout/memorize.md): the request is the one the reading check builds for a woven verse (its
// pieces in order, each with its language, target_text their text end to end), the mill is the fake Postern, and the answer comes back typed for judgeReading. Offline, the promise rejects
// with a TutorError, which the session reads as 'grade yourself'.
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GreekWord, Verse } from '../../src/data/chapter';
import type { Woven, WovenVerse } from '../../src/data/weave';
import type { Recording } from '../../src/audio/recorder';
import { sendWeaveRecall, weaveOfRecall } from '../../src/memorize/sendWeave';
import { isVerseReadAnswer } from '../../src/services/reading';
import { OFFLINE_MESSAGE, TutorError, tutorTimings } from '../../src/services/tutor';
import { makeFakePostern, WELL_READ_ANSWER, type FakePostern } from '../support/fake-postern';

const word = (t: string): GreekWord => ({ t, l: t, p: 'x', s: 'x' }) as unknown as GreekWord;
const verse = (n: number, chunks: { t: string; g: number[] }[], g: string[]): Verse => ({ n, g: g.map(word), e: chunks }) as unknown as Verse;
const v28 = verse(28, [{ t: 'And', g: [0] }, { t: ' we know ', g: [1] }, { t: 'that', g: [] }, { t: 'love', g: [2] }], ['Καὶ', 'οἴδαμεν', 'ἀγαπῶσιν']);
const shown = (v: Verse, ...chunks: number[]): WovenVerse => v.e.map((c, i): Woven => (chunks.includes(i) ? { words: c.g.map((k) => v.g[k]), learning: false } : null));
const recording: Recording = { blob: new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/webm' }), mime: 'audio/webm', durationMs: 4000 };

let postern: FakePostern;
let saved: typeof tutorTimings;
beforeEach(() => {
  postern = makeFakePostern();
  saved = { ...tutorTimings };
  tutorTimings.pollMs = 10;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => postern.fetch(input, init));
});
afterEach(() => {
  Object.assign(tutorTimings, saved);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the Weave of a recall', () => {
  it("is the reading check's weave: Greek where the weave shows Greek, English elsewhere, neighbours of one language joined", () => {
    const weave = weaveOfRecall([v28], [shown(v28, 0, 3)], 'el');
    expect(weave.segments).toEqual([
      { text: 'Καὶ', lang: 'el' },
      { text: 'we know that', lang: 'en' },
      { text: 'ἀγαπῶσιν', lang: 'el' },
    ]);
  });

  it('is the English alone, in one segment, when nothing is woven to Greek yet', () => {
    const weave = weaveOfRecall([v28], [shown(v28)], 'el');
    expect(weave.segments).toEqual([{ text: 'And we know that love', lang: 'en' }]);
    expect(weave.words).toEqual([]);
  });
});

describe('sending a Weave recall', () => {
  it('carries target_text as the pieces joined, the pieces with their languages and lang en, and the mill answer comes back typed', async () => {
    postern.autoReply = { status: 'answered', answer: WELL_READ_ANSWER };
    const answer = await sendWeaveRecall('Romans 8:28', [v28], [shown(v28, 0, 3)], recording);
    expect(isVerseReadAnswer(answer)).toBe(true);
    expect(answer.verdict).toBe('well-read');
    expect(postern.received).toHaveLength(1);
    const { grist, input, attachments } = postern.received[0];
    expect(grist.kind).toBe('verse-read');
    expect(input).toMatchObject({
      reference: 'Romans 8:28',
      target_text: 'Καὶ we know that ἀγαπῶσιν',
      lang: 'en',
      segments: [
        { text: 'Καὶ', lang: 'el' },
        { text: 'we know that', lang: 'en' },
        { text: 'ἀγαπῶσιν', lang: 'el' },
      ],
    });
    expect(attachments).toHaveLength(1);
    expect(attachments[0].mime).toBe('audio/webm');
  });

  it('rejects with a TutorError the session reads as grade yourself when the phone is offline', async () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    postern.down = true;
    const err = await sendWeaveRecall('Romans 8:28', [v28], [shown(v28, 0)], recording).then(
      () => null,
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(TutorError);
    expect((err as TutorError).failure).toBe('unreachable');
    expect((err as TutorError).message).toBe(OFFLINE_MESSAGE);
  });
});
