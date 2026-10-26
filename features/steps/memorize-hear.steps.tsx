// features/steps/memorize-hear.steps.tsx — runs features/memorize-hear.feature: Lampas hears a recall (src/memorize/useRecallHold.ts, sendWeave.ts). The session screen is a later story's; a small probe
// stands in for it here, a bar over the hold and, once the words or the recording are in, the judge and the Dexie `recalls` table. The recogniser is tests/support/fake-recognizer.ts, the
// recorder tests/support/fake-recorder.ts, the mill the fake Postern; the chapter is the committed Romans 8.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { recallsOf } from '../../src/data/repositories/memorize';
import type { Judgement } from '../../src/memorize/judge';
import type { MemorizeLang } from '../../src/memorize/languages';
import { versesOf } from '../../src/memorize/refs';
import { tokensOf } from '../../src/memorize/target';
import { wovenOf } from '../../src/reader/useWoven';
import { tutorTimings } from '../../src/services/tutor';
import { Probe, type Setup } from '../../tests/support/recall-probe';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { FakeRecognizer, result, stubRecognizer } from '../../tests/support/fake-recognizer';
import { FakeRecorder, stubRecorder } from '../../tests/support/fake-recorder';
import { makeFakePostern, WELL_READ_ANSWER, type FakePostern } from '../../tests/support/fake-postern';

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

let postern: FakePostern;
let setup: Setup;
let judged: Judgement | undefined;

async function open(ref: string, lang: MemorizeLang, solid: string[] = [], withMill = false): Promise<void> {
  await reset();
  if (withMill) {
    // the chapter comes from disk, the mill is the fake Postern
    postern = makeFakePostern();
    const chapters = globalThis.fetch;
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith('/data/') ? chapters(input) : postern.fetch(input, init)));
  }
  const found = await versesOf(ref);
  if (!found) throw new Error(`no text for ${ref}`);
  const woven = lang === 'weave' ? wovenOf(found.source, { view: 'english', weave: 'solid', weaveShown: true, weaveGrammar: 'any', weaveOrder: 'english', levels: new Map(), solid: new Set(solid) }) : null;
  const target = found.verses.flatMap((v) => tokensOf(v, lang, woven?.[found.source.verses.indexOf(v)] ?? null));
  setup = { ref, lang, found, target, woven };
  render(<Probe s={setup} onJudged={(j) => (judged = j)} />);
}

const holdBar = async (): Promise<void> => {
  fireEvent.pointerDown(await screen.findByRole('button', { name: /Hold to (talk|say it)/ }), { pointerId: 1, clientX: 10, clientY: 10 });
};
const letGo = async (): Promise<void> => {
  fireEvent.pointerUp(await screen.findByRole('button', { name: /Release|Say it|Hold to say it|talk/i }), { pointerId: 1, clientX: 10, clientY: 10 });
};

/** Each step is a test of its own, so a scenario starts here: in its first Given. */
async function reset(): Promise<void> {
  cleanup();
  judged = undefined;
  stubRecognizer();
  stubRecorder();
  stubChapterFetch();
  await db.open();
  await db.recalls.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, '00'.repeat(31) + '03');
  tutorTimings.pollMs = 10;
}

const feature = await loadFeature('features/memorize-hear.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('I say the verse in Greek and the phone listens in Greek', ({ Given, When, Then, And }) => {
    Given('the Memorize session is open on {string} in Greek', (_, ref: string) => open(ref, 'el'));
    When('I hold the bar and say the whole verse in Greek', async () => {
      await holdBar();
      await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(0));
      const recogniser = FakeRecognizer.last();
      recogniser.open();
      recogniser.say([result(setup.target.map((t) => t.text).join(' '), false)]);
      await letGo();
    });
    Then('the phone listened in Greek and only in Greek', () => {
      expect(FakeRecognizer.instances.length).toBeGreaterThan(0);
      expect(FakeRecognizer.instances.map((r) => r.lang)).toEqual(FakeRecognizer.instances.map(() => 'el-GR'));
    });
    And('the recall is judged against the Greek and passes', async () => {
      await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Passed'));
      expect(judged?.asked.every((a) => a.lang === 'el')).toBe(true);
      expect((await recallsOf(setup.ref, 'el')).map((r) => r.how)).toEqual(['said']);
    });
  });

  Scenario('My phone cannot hear Greek: I grade myself', ({ Given, And, When, Then }) => {
    Given('the Memorize session is open on {string} in Greek', (_, ref: string) => open(ref, 'el'));
    And('my phone cannot take dictation in Greek', () => {
      FakeRecognizer.noSpeechFor = ['el-GR', 'el'];
    });
    When('I hold the bar and say the whole verse in Greek', async () => {
      await holdBar();
      await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(0));
      FakeRecognizer.answerChecks();
    });
    Then('the session says {string}', async (_, words: string) => {
      await waitFor(() => expect(screen.getByRole('status').textContent).toBe(words));
      expect(FakeRecognizer.instances.every((r) => r.lang.startsWith('el'))).toBe(true);
    });
    When('I tap {string}', (_, name: string) => {
      fireEvent.click(screen.getByRole('button', { name }));
    });
    Then('the recall of {string} in Greek is kept as graded by myself and passes', async (_, ref: string) => {
      await waitFor(async () => expect((await recallsOf(ref, 'el')).map((r) => r.how)).toEqual(['self']));
      expect((await recallsOf(ref, 'el'))[0].score).toBe(1);
    });
  });

  Scenario('A Weave recall is recorded and checked by the mill', ({ Given, When, Then, And }) => {
    Given('the Memorize session is open on {string} in the Weave with his solid words {string} and {string}', async (_, ref: string, a: string, b: string) => {
      await open(ref, 'weave', [a, b], true);
    });
    When('I hold the bar and say the whole verse as the weave shows it', async () => {
      await holdBar();
      await waitFor(() => expect(FakeRecorder.instances.length).toBeGreaterThan(0));
      await letGo();
    });
    Then('the mill is sent my recording with the verse as the weave shows it, each piece in its language', async () => {
      await waitFor(() => expect(postern.received).toHaveLength(1));
      const { input, attachments, grist } = postern.received[0];
      expect(grist.kind).toBe('verse-read');
      expect(attachments).toHaveLength(1);
      const segments = input.segments as { text: string; lang: string }[];
      expect(new Set(segments.map((s) => s.lang))).toEqual(new Set(['el', 'en']));
      expect(input.target_text).toBe(segments.map((s) => s.text).join(' '));
      expect(input.target_text).toBe(setup.target.map((t) => t.text).join(' '));
    });
    And('no dictation was started', () => {
      expect(FakeRecognizer.instances).toHaveLength(0);
    });
    When('the mill answers that it was well read', async () => {
      await postern.answer({ status: 'answered', answer: WELL_READ_ANSWER });
    });
    Then('the recall of {string} in the Weave is kept as checked by the mill and passes', async (_, ref: string) => {
      await waitFor(async () => expect((await recallsOf(ref, 'weave')).map((r) => r.how)).toEqual(['mill']));
      expect((await recallsOf(ref, 'weave'))[0].score).toBe(1);
      expect(judged?.asked.some((a) => a.lang === 'el')).toBe(true);
    });
  });
});
