// tests/unit/talk-through-pause.test.tsx — a hold with a pause in it yields the whole sentence, on the Talk sheet's bar and in Ask the tutor (mw-06ggew.7, replacing
// talk-pause-no-restart.test.tsx, which asserted the old path: Lampas's own copy did not start the recogniser again after Android ended it on a pause and recorded the rest).
// Every bar is voice-kit's now (TalkBar through src/talk/useTalkHold.ts, and the Composer), listening through voice-kit's throughPauses default: the recogniser Android ends
// on a 3 s silence is started again at once, the words heard before it are kept, and the words after it follow, all in the turn that is sent. The recogniser is
// tests/support/fake-recognizer.ts. A phone that can record is given a recorder to prove nothing is recorded: the pause is heard, not recorded and replayed.
import 'fake-indexeddb/auto';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AskComposer } from '../../src/Ask';
import type { Verse } from '../../src/data/chapter';
import { forgetSpoken, wasSpoken } from '../../src/speech/spoken';
import { HeldTalkBar } from '../../src/talk/Bars';
import { useTalkHold } from '../../src/talk/useTalkHold';
import { LAMPAS_TALK_SETTINGS } from '../../src/talkSettings';
import { FakeRecognizer, result, stubRecognizer } from '../support/fake-recognizer';

class Stream {
  getTracks() {
    return [{ stop: vi.fn() }];
  }
}
class Recorder {
  static made: Recorder[] = [];
  static isTypeSupported = () => true;
  state: 'inactive' | 'recording' = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor() {
    Recorder.made.push(this);
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.onstop?.();
  }
}

function canRecord(): void {
  Recorder.made = [];
  vi.stubGlobal('MediaRecorder', Recorder);
  vi.stubGlobal('MediaStream', Stream);
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.resolve(new Stream()) }, configurable: true, writable: true });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  stubRecognizer();
  canRecord();
  forgetSpoken();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true, writable: true });
});

const pass = (ms = 0) => act(() => vi.advanceTimersByTimeAsync(ms));

/** The recogniser Android ends on a silence: the error and the end it fires, and the start the kit answers with. */
async function endOnPause(held: FakeRecognizer): Promise<void> {
  await act(async () => {
    held.onerror?.({ error: 'no-speech' });
    held.onend?.();
    await vi.advanceTimersByTimeAsync(0);
  });
}

/** Holds `bar`, says `before`, goes quiet for 3 s (Android ends the recogniser), says `after` and lets go; the whole of what was said is what the hold comes to. */
async function holdThroughPause(bar: HTMLElement, before: string, after: string): Promise<FakeRecognizer> {
  fireEvent.pointerDown(bar);
  await pass();
  const held = FakeRecognizer.last();
  act(() => {
    held.open();
    held.say([result(before, true)]);
  });
  await pass(3000);
  await endOnPause(held);
  // started again at once, the hold going on through the pause: no recording stands in for it
  expect(held.startFn).toHaveBeenCalledTimes(2);
  expect(Recorder.made).toHaveLength(0);
  act(() => held.say([result(after, false)]));
  fireEvent.pointerUp(bar, { clientX: 10, clientY: 10 });
  await pass();
  await pass();
  return held;
}

function Sheet({ sent }: { sent: string[] }) {
  const voice = useTalkHold((text) => sent.push(text));
  return (
    <>
      <HeldTalkBar hold={voice} />
      <p data-testid="live">{voice.transcript}</p>
    </>
  );
}

describe('the Talk sheet\'s bar (voice-kit TalkBar over useTalkHold) through a 3 s pause in one hold', () => {
  it('starts the recogniser again after it ends, keeps the words before, and sends the whole sentence', async () => {
    const sent: string[] = [];
    render(<Sheet sent={sent} />);
    const held = await holdThroughPause(screen.getByRole('button', { name: /Hold to talk|Starting the mic|Release to send/ }), 'why does Paul say', 'all things to all people');
    expect(FakeRecognizer.instances).toHaveLength(1);
    expect(held.startFn).toHaveBeenCalledTimes(2);
    expect(sent).toEqual(['why does Paul say all things to all people']);
    // the words went by voice: the question made of them is sent as spoken (src/speech/spoken.ts)
    expect(wasSpoken('why does Paul say all things to all people')).toBe(true);
  });

  it('keeps the live words on the screen through the pause', async () => {
    render(<Sheet sent={[]} />);
    fireEvent.pointerDown(screen.getByRole('button', { name: /Hold to talk/ }));
    await pass();
    const held = FakeRecognizer.last();
    act(() => {
      held.open();
      held.say([result('why does Paul say', true)]);
    });
    await pass(3000);
    await endOnPause(held);
    expect(screen.getByTestId('live')).toHaveTextContent('why does Paul say');
    expect(screen.getByRole('button', { name: 'Release to send' })).toBeInTheDocument();
  });
});

describe('Ask the tutor (voice-kit Composer with LAMPAS_TALK_SETTINGS) through a 3 s pause in one hold', () => {
  it('uses the same settings as the Talk bar: hold to talk, the words go on release', () => {
    expect(LAMPAS_TALK_SETTINGS).toEqual({ talk: 'hold', send: 'release' });
  });

  it('starts the recogniser again after it ends and asks the whole sentence', async () => {
    const verse = { n: 1, g: [{ t: 'Τεκνία' }], e: [{ t: 'My little children' }] } as unknown as Verse;
    const asked: string[] = [];
    render(<AskComposer book="1jn" chapter={2} verse={verse} reference="1 John 2:1" state={undefined} onAsk={(_verse, question) => asked.push(question)} />);
    await pass(100);
    const held = await holdThroughPause(screen.getByRole('button', { name: 'Hold to ask' }), 'why does Paul say', 'all things to all people');
    expect(FakeRecognizer.instances).toHaveLength(1);
    expect(held.startFn).toHaveBeenCalledTimes(2);
    expect(asked).toEqual(['why does Paul say all things to all people']);
  });
});
