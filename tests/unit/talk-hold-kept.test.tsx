// tests/unit/talk-hold-kept.test.tsx — a hold of the Talk bar never drops what he said, and never sends it unless he let go (mw-06ggew.15). voice-kit 0.7.0 hands
// on the words of every end of a hold: 'heard' when he let go (words to send) and 'kept' for a slide off, the phone taking the touch, the recogniser failing, or it
// ending by itself (words to keep unsent). The Talk bar sends the first and puts the second in the Talk sheet's field (src/talk/keptWords.ts) — a slide off must not send.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeldTalkBar } from '../../src/talk/Bars';
import { registerKeeper } from '../../src/talk/keptWords';
import { useTalkHold } from '../../src/talk/useTalkHold';
import { FakeRecognizer, result, stubRecognizer } from '../support/fake-recognizer';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  stubRecognizer();
});
let off: (() => void) | null = null;
const keeping = (kept: string[]): void => {
  off = registerKeeper((words) => kept.push(words));
};
afterEach(() => {
  off?.();
  off = null;
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const pass = (ms = 0) => act(() => vi.advanceTimersByTimeAsync(ms));
const SAID = "John refers to himself as the Elder and it's";

function Strip({ sent }: { sent: string[] }) {
  const hold = useTalkHold((text) => sent.push(text));
  return <HeldTalkBar hold={hold} />;
}

async function holdAndSay(): Promise<{ bar: HTMLElement; recogniser: FakeRecognizer }> {
  const bar = screen.getByRole('button', { name: /Hold to talk/ });
  fireEvent.pointerDown(bar);
  await pass();
  const recogniser = FakeRecognizer.last();
  act(() => {
    recogniser.open();
    recogniser.say([result(SAID, false)]);
  });
  return { bar, recogniser };
}

describe('the Talk bar (useTalkHold) and the words of a hold that does not end in a release', () => {
  it('a release sends the words, and keeps nothing in the field', async () => {
    const sent: string[] = [];
    const kept: string[] = [];
    keeping(kept);
    render(<Strip sent={sent} />);
    const { bar } = await holdAndSay();
    fireEvent.pointerUp(bar, { clientX: 10, clientY: 10 });
    await pass();
    await pass();
    expect(sent).toEqual([SAID]);
    expect(kept).toEqual([]);
  });

  it('a slide off keeps the words in the field and sends nothing', async () => {
    const sent: string[] = [];
    const kept: string[] = [];
    keeping(kept);
    render(<Strip sent={sent} />);
    const { bar } = await holdAndSay();
    fireEvent.pointerCancel(bar);
    await pass();
    await pass();
    expect(sent).toEqual([]);
    expect(kept).toEqual([SAID]);
  });

  it('the recogniser failing after words were heard keeps them in the field', async () => {
    const sent: string[] = [];
    const kept: string[] = [];
    keeping(kept);
    render(<Strip sent={sent} />);
    const { recogniser } = await holdAndSay();
    // the microphone taken from the recogniser (audio-capture) ends the hold at once
    await act(async () => recogniser.onerror?.({ error: 'audio-capture' }));
    await pass();
    expect(sent).toEqual([]);
    expect(kept).toEqual([SAID]);
  });

  it('words kept while no sheet is open wait for the next one', async () => {
    const sent: string[] = [];
    render(<Strip sent={sent} />);
    const { bar } = await holdAndSay();
    fireEvent.pointerCancel(bar);
    await pass();
    await pass();
    const kept: string[] = [];
    keeping(kept);
    expect(kept).toEqual([SAID]);
    expect(sent).toEqual([]);
  });
});
