// The reading check's recording is heard whole (mw-5r3p30.684): a reading of more than a minute goes on as one clip, and a reading the
// ten-minute cap stops says so in the result, never a silent partial. The mill is a fake askVerseRead; the recorder is tests/support/fake-recorder.ts.
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Verse } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import type { Recording } from '../../src/audio/recorder';
import type { VerseReadAnswer } from '../../src/services/reading';
import { MAX_RECORDING_MS } from '../../src/audio/recorder';
import { cutNote } from '../../src/services/reading';
import { FakeRecorder, stubRecorder } from '../support/fake-recorder';
import { useReadChecks, type KeepAnswer } from '../../src/useReadChecks';

const asked = vi.hoisted(() => ({ calls: [] as { target: string; recording: Recording }[], answer: undefined as unknown }));
vi.mock('../../src/services/reading', async (original) => ({
  ...(await original<typeof import('../../src/services/reading')>()),
  askVerseRead: vi.fn(async (request: { target_text: string }, recording: Recording) => {
    asked.calls.push({ target: request.target_text, recording });
    return asked.answer;
  }),
}));
vi.mock('../../src/services/deviceKey', () => ({ getDeviceKeyBytes: () => new Uint8Array(32) }));

const verse: Verse = {
  n: 1,
  g: [{ t: 'Ὃ', tr: 'ho', s: 'G3739', l: 'ὅς', p: 'R-NSN' } as Verse['g'][number]],
  e: [{ t: 'That which was from the beginning, which we have heard', g: [0] }],
};
const whole: VerseReadAnswer = { verdict: 'well-read', focus_words: [], note: 'Well read.' };
const partial: VerseReadAnswer = {
  verdict: 'partial',
  focus_words: [],
  note: 'Good start.',
  reached: 4,
  next_word: { word: 'beginning,', index: 5, chunks: ['beginning'], tip: 'Say be-GIN-ning.' },
};

beforeEach(async () => {
  stubRecorder();
  asked.calls = [];
  await db.open();
});
afterEach(() => db.close());

type Hook = ReturnType<typeof renderHook<ReturnType<typeof useReadChecks>, unknown>>['result']['current'];

/** He presses Read on the verse, `how` ends the recording, and what is kept of the answer comes back. */
async function read(answer: VerseReadAnswer, how: (hook: Hook, recorder: FakeRecorder) => Promise<void>): Promise<VerseReadAnswer> {
  asked.answer = answer;
  const kept: VerseReadAnswer[] = [];
  const keep: KeepAnswer = (_unit, got) => void kept.push(got);
  const { result } = renderHook(() => useReadChecks('1jo', 1, '1 John 1', 'english', undefined, keep));
  await act(async () => result.current.press(verse));
  await act(async () => how(result.current, FakeRecorder.last()));
  await waitFor(() => expect(kept).toHaveLength(1));
  return kept[0];
}

describe('a long reading', () => {
  it('of 150 seconds, let go by hand, is sent whole as one clip and its result is kept as the mill answered it', async () => {
    FakeRecorder.durationMs = 150_000;
    const got = await read(whole, async (hook) => hook.release());
    expect(asked.calls).toHaveLength(1);
    expect(asked.calls[0].recording.durationMs).toBe(150_000);
    expect(got).toEqual(whole);
  });

  it('that the ten-minute cap stops is sent whole and the result says it was cut: how long, and the last word heard', async () => {
    FakeRecorder.durationMs = MAX_RECORDING_MS;
    const got = await read(partial, async (_hook, recorder) => recorder.hitCap());
    expect(asked.calls).toHaveLength(1);
    expect(asked.calls[0].recording.durationMs).toBe(MAX_RECORDING_MS);
    expect(got.verdict).toBe('partial');
    expect(got.note).toMatch(/stopped after 10 minutes/);
    expect(got.note).toMatch(/last word I heard was “the”/);
    expect(got.note.endsWith('Good start.')).toBe(true);
  });

  it('that the cap stops, though read to the end, still says it ran to the limit, and names no word', async () => {
    FakeRecorder.durationMs = MAX_RECORDING_MS;
    const got = await read(whole, async (_hook, recorder) => recorder.hitCap());
    expect(got.note).toMatch(/stopped after 10 minutes/);
    expect(got.note).not.toMatch(/last word/);
  });

  it('that the cap did not stop gets no such line', async () => {
    FakeRecorder.durationMs = 90_000;
    const got = await read(partial, async (hook) => hook.release());
    expect(got.note).toBe('Good start.');
  });
});

describe('cutNote', () => {
  it('names the last word of a partial reading from the text, and the minutes the cap allows', () => {
    expect(cutNote(partial, 'That which was from the beginning,')).toBe(
      'Your reading was stopped after 10 minutes, the longest this check hears, so only that much was heard. The last word I heard was “the”.',
    );
  });
});
