// The room a tutor request has under its cap (mw-5r3p30.689): the quiz-me spec's second request came to 6495 of 6500 bytes once the guide and the words of the text had
// given way, so the next registry setting would have made fitHistory drop the earlier turn and the tutor forget what it had just asked. Every request built against
// MAX_REQUEST_BYTES keeps HEADROOM_BYTES free on its largest example, and a request at the cap still seals under bsv-kit's grist payload limit.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PrivateKey, Utils } from '@bsv/sdk';
import { grist } from 'bsv-kit/grist';
import { type Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { learnerGrammar } from '../../src/data/grammar/learnerGrammar';
import { passageVerse, passagesOf } from '../../src/data/passage';
import { learnerSummary } from '../../src/data/learnerSummary';
import { listSolidHeadwords } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { MAX_REQUEST_BYTES } from '../../src/services/requestBudget';
import { buildTalkRequest, fitHistory, type TalkRequest } from '../../src/services/talk';
import { buildRequest, fitAsk } from '../../src/services/tutor';
import { SETTINGS } from '../../src/settings/registry';
import type { SettingValue } from '../../src/settings/define';
import { QUIZ_GOAL_MAX } from '../../src/data/repositories/settings';
import { MILL_PUBLIC_KEY, QUIZ_ANSWER } from '../support/fake-postern';
import { seedHisWords } from '../support/his-words';

/** The room a request keeps under MAX_REQUEST_BYTES after the lesser fields have given way: a setting added later fits without costing a turn. */
const HEADROOM_BYTES = 1000;

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const passage = passageVerse(passagesOf(chapter.verses)[0]);
const bytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;

/** Every registry setting at its longest value, as the request carries them (currentSettings): the longest choice, the biggest number, the longest text a person may keep. */
function longestSettings(): Record<string, SettingValue> {
  return Object.fromEntries(
    SETTINGS.map((s): [string, SettingValue] => {
      const a = s.allowed;
      if (a.kind === 'choice') return [s.key, a.values.reduce((longest, v) => (v.value.length > longest.length ? v.value : longest), '')];
      if (a.kind === 'number') return [s.key, a.max];
      return [s.key, s.key === 'quizGoal' ? 'q'.repeat(QUIZ_GOAL_MAX) : a.example];
    }),
  );
}

/** The sealed record of a request, as the phone makes it: base64 of the plaintext in the envelope; throws a RangeError over bsv-kit's payload cap. */
function sealedBytes(kind: string, input: unknown): number {
  const plaintext = { grist: { app: 'lampas', kind, v: '1' }, input, attachments: [] };
  const key = Uint8Array.from(Utils.toArray(PrivateKey.fromRandom().toHex(), 'hex'));
  const envelope = grist.sealEnvelope(JSON.stringify(plaintext), key, MILL_PUBLIC_KEY, 1_790_000_000);
  grist.recordScriptHex(envelope);
  return JSON.stringify(envelope).length;
}

afterAll(() => db.close());
beforeEach(async () => {
  clearBus();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  await seedHisWords();
});

describe('the quiz-me second request (features/quiz-me.feature: an answer carries the earlier turn)', () => {
  /** The second request of a quiz on Romans 8:1-11 as the app builds it: his words and what Lampas knows of him, every setting at its longest, one earlier turn. */
  async function secondQuizRequest(): Promise<TalkRequest> {
    const solid = await listSolidHeadwords();
    const turns = [{ q: 'Quiz me on Romans 8:1-11.', a: QUIZ_ANSWER.answer }];
    return buildTalkRequest({ title: 'Romans 8', chapter, verse: passage, quiz: true }, 'No condemnation', turns, solid, longestSettings(), undefined, await learnerSummary(), await learnerGrammar());
  }

  it('keeps its earlier turn with the headroom to spare once the guide and the words of the text have given way', async () => {
    const request = await secondQuizRequest();
    const fitted = fitHistory({ ...request, greek_words: [], pronunciation_guide: undefined });
    expect(fitted.history).toEqual(request.history);
    expect(fitted.history).toHaveLength(1);
    expect(MAX_REQUEST_BYTES - bytes(fitted), `the request weighs ${bytes(fitted)} of ${MAX_REQUEST_BYTES}`).toBeGreaterThanOrEqual(HEADROOM_BYTES);
  });

  it('a request at the cap seals under the grist payload limit', () => {
    const filler = 'a'.repeat(MAX_REQUEST_BYTES - bytes({ question: '' }) - 1);
    const input = { question: filler };
    expect(bytes(input)).toBe(MAX_REQUEST_BYTES - 1);
    // 20 KiB: bsv-kit's grist MAX_PAYLOAD_BYTES; the sealed record is base64 of the plaintext and the envelope, and must leave at least 6 KiB
    expect(20 * 1024 - sealedBytes('bible-talk', input)).toBeGreaterThanOrEqual(6 * 1024);
  });
});

describe('every request built against MAX_REQUEST_BYTES', () => {
  it('the Verse view ask, on the largest verse with every setting, keeps the headroom once its lesser fields have given way', async () => {
    const verse = chapter.verses.reduce((a, b) => (bytes(b.g) + bytes(b.e) > bytes(a.g) + bytes(a.e) ? b : a));
    const request = buildRequest('Romans 8', verse, 'What does it mean?', [], await learnerSummary(), await learnerGrammar(), longestSettings() as Record<string, string>);
    const bare = fitAsk({ ...request, greek_words: [], pronunciation_guide: undefined });
    expect(MAX_REQUEST_BYTES - bytes(bare), `the ask weighs ${bytes(bare)} of ${MAX_REQUEST_BYTES}`).toBeGreaterThanOrEqual(HEADROOM_BYTES);
  });
});
