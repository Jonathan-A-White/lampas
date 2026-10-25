// The nightly run on the phone's own wiring (mw-t3xu9a.8): no injected dependency but the clock. Its record is the kit's Dexie store (src/tutor/registry.ts), the grist goes through the gated client to a fake Postern,
// and the misses worth a story go out as a 'feedback' grist of the kind tutor-misses. The schedule and the answer's effects are in tutor-weights-schedule.test.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { getTuned } from '../../src/data/repositories/tuned';
import { setCurrentLicence } from '../../src/services/licenceNow';
import { tutorTimings } from '../../src/services/tutor';
import { askBack, bibleTalkClient } from '../../src/tutor/registry';
import { tuneTheWeights, type WeightsAnswer } from '../../src/tutor/weightsRun';
import { makeFakePostern, type FakePostern } from '../support/fake-postern';
import { validate, type Schema } from '../support/schema-validate';

const schema = (kind: string): Schema => JSON.parse(readFileSync(`grinds/${kind}.input.schema.json`, 'utf8')) as Schema;
const NIGHT = () => new Date(2026, 9, 25, 4, 0, 0);

const answer: WeightsAnswer = {
  lists: { Reader: ['progress', 'rusty-words'] },
  reasons: ['The Reader asked for your progress 2 times lately, and rusty words go with it, so both are read up front there now.'],
  misses_worth_a_story: [{ title: 'A fact for the verses he marked', why: 'He wanted them twice and no fact holds them.', screen: 'Reader', name: 'the verses he marked' }],
};

let postern: FakePostern;

beforeEach(async () => {
  postern = makeFakePostern();
  postern.kindReplies = { 'tutor-weights': { status: 'answered', answer }, feedback: { status: 'answered', answer: { status: 'sent' } } };
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => postern.fetch(input, init));
  tutorTimings.pollMs = 20;
  setCurrentLicence('licensed');
  localStorage.clear();
  localStorage.setItem(DEVICE_KEY_STORAGE_KEY, '11'.repeat(32));
  await db.open();
  await db.settings.clear();
  // two ask-backs for progress and two misses, on the screen he is on (the Reader): the counts the night reads
  await askBack(['progress', 'progress'], 1);
  await bibleTalkClient().takeAnswer({ misses: [{ wanted: 'the verses he marked', why: 'no fact holds them' }, { wanted: 'the verses he marked', why: 'no fact holds them' }] }, 1);
});
afterEach(() => {
  setCurrentLicence('licensed');
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});

describe('the night with the phone\'s own wiring', () => {
  it('sends one tutor-weights grist, forwards the misses as a tutor-misses feedback grist, applies the list and keeps the run', async () => {
    const result = await tuneTheWeights({ now: NIGHT });
    expect(typeof result === 'object' && result.tuned).toMatchObject({ date: '2026-10-25', changes: 1, forwarded: 1 });

    const kinds = postern.received.map((r) => r.grist.kind);
    expect(kinds).toEqual(['tutor-weights', 'feedback']);
    const weights = postern.received.find((r) => r.grist.kind === 'tutor-weights')!;
    expect(weights.grist).toMatchObject({ app: 'lampas', kind: 'tutor-weights', v: '1' });
    expect(validate(weights.input, schema('tutor-weights'))).toEqual([]);
    const sent = weights.input as unknown as { report: { screens: Record<string, { counts: Record<string, number> }> } };
    expect(sent.report.screens.Reader.counts.progress).toBeGreaterThanOrEqual(2);

    const forwarded = postern.received.find((r) => r.grist.kind === 'feedback')!;
    expect(validate(forwarded.input, schema('feedback'))).toEqual([]);
    expect(forwarded.input).toMatchObject({ kind: 'tutor-misses', summary: 'Tutor misses worth a story: 1', misses: [{ title: 'A fact for the verses he marked', screen: 'Reader', count: 2 }] });

    expect(await bibleTalkClient().upFront('Reader')).toEqual(expect.arrayContaining(['progress', 'rusty-words']));
    expect(await getTuned()).toMatchObject({ date: '2026-10-25', changes: 1 });
  });

  it('is not shown in Your requests: the forward is the app\'s, not his', async () => {
    await tuneTheWeights({ now: NIGHT });
    expect(await db.requests.count()).toBe(0);
  });

  it('sends nothing offline, with no key or with no licence', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    expect(await tuneTheWeights({ now: NIGHT })).toBe('not-ready');
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    localStorage.removeItem(DEVICE_KEY_STORAGE_KEY);
    expect(await tuneTheWeights({ now: NIGHT })).toBe('not-ready');
    localStorage.setItem(DEVICE_KEY_STORAGE_KEY, '11'.repeat(32));
    setCurrentLicence('not-licensed');
    expect(await tuneTheWeights({ now: NIGHT })).toBe('not-ready');
    expect(postern.received).toEqual([]);
    expect(await getTuned()).toBeUndefined();
  });
});
