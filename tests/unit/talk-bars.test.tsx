// tests/unit/talk-bars.test.tsx — Lampas's two uses of voice-kit's one hold-to-talk bar (src/talk/Bars.tsx; replaces hold-bar.test.tsx, which tested the bar Lampas used to keep
// of its own): the bar is the kit's (bk-composer__bar) in Lampas's size (lp-bar, src/index.css), the Reader's Talk bar is a tap below the hold's delay and a hold above it, and the
// recording bar (the reading check, Try it) holds from the first touch, lets go with a release and drops on a slide off.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeldTalkBar, RecordBar } from '../../src/talk/Bars';
import { HOLD_AFTER_MS, useTalkHold } from '../../src/talk/useTalkHold';
import { BAR_HEIGHT_PX } from '../../src/ui/barClass';
import { FakeRecognizer, result, stubRecognizer } from '../support/fake-recognizer';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  stubRecognizer();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const pass = (ms = 0) => act(() => vi.advanceTimersByTimeAsync(ms));

function TalkStrip({ taps, pressed, sent }: { taps: string[]; pressed: string[]; sent: string[] }) {
  const hold = useTalkHold((text) => sent.push(text), { holdDelayMs: HOLD_AFTER_MS, onBegin: () => taps.push('hold') });
  return <HeldTalkBar hold={hold} labels={{ hold: 'Talk', release: 'Talk', starting: 'Talk' }} onPress={() => pressed.push('press')} onTap={() => taps.push('tap')} fit="compact" />;
}

describe("the Reader's Talk bar (HeldTalkBar with a hold delay and a tap)", () => {
  it("is voice-kit's bar in Lampas's size, 96 px", () => {
    expect(BAR_HEIGHT_PX).toBe(96);
    render(<TalkStrip taps={[]} pressed={[]} sent={[]} />);
    const bar = screen.getByRole('button', { name: 'Talk' });
    expect(bar).toHaveClass('bk-composer__bar', 'lp-bar', 'lp-bar-compact');
    expect(bar.querySelector('svg')).not.toBeNull();
  });

  it('a press let go before the delay is a tap, and listens to nothing', async () => {
    const taps: string[] = [];
    const pressed: string[] = [];
    render(<TalkStrip taps={taps} pressed={pressed} sent={[]} />);
    const bar = screen.getByRole('button', { name: 'Talk' });
    fireEvent.pointerDown(bar);
    await pass(HOLD_AFTER_MS - 100);
    fireEvent.pointerUp(bar);
    fireEvent.click(bar);
    await pass();
    expect(pressed).toEqual(['press']);
    expect(taps).toEqual(['tap']);
    expect(FakeRecognizer.instances).toHaveLength(0);
  });

  it('a press held past the delay is a hold: it begins, listens, sends on release, and the click that ends it is no tap', async () => {
    const taps: string[] = [];
    const sent: string[] = [];
    render(<TalkStrip taps={taps} pressed={[]} sent={sent} />);
    const bar = screen.getByRole('button', { name: 'Talk' });
    fireEvent.pointerDown(bar);
    await pass(HOLD_AFTER_MS + 50);
    expect(taps).toEqual(['hold']);
    const held = FakeRecognizer.last();
    act(() => {
      held.open();
      held.say([result('what does this mean', true)]);
    });
    fireEvent.pointerUp(bar, { clientX: 10, clientY: 10 });
    fireEvent.click(bar);
    await pass();
    await pass();
    expect(sent).toEqual(['what does this mean']);
    expect(taps).toEqual(['hold']);
  });

  it('the next press is a tap again', async () => {
    const taps: string[] = [];
    render(<TalkStrip taps={taps} pressed={[]} sent={[]} />);
    const bar = screen.getByRole('button', { name: 'Talk' });
    fireEvent.pointerDown(bar);
    await pass(HOLD_AFTER_MS + 50);
    fireEvent.pointerUp(bar, { clientX: 10, clientY: 10 });
    fireEvent.click(bar);
    await pass();
    await pass();
    fireEvent.pointerDown(bar);
    fireEvent.pointerUp(bar);
    fireEvent.click(bar);
    expect(taps).toEqual(['hold', 'tap']);
  });
});

describe('the recording bar (RecordBar: the reading check, Try it)', () => {
  it('holds from the first touch, goes alert while it records and is dimmed when it cannot be held', () => {
    const calls: string[] = [];
    const bar = (props: { listening: boolean; disabled?: boolean; label: string }) => (
      <RecordBar {...props} onPress={() => calls.push('press')} onRelease={() => calls.push('release')} onAbort={() => calls.push('abort')} />
    );
    const { rerender } = render(bar({ listening: false, label: 'Hold to read verse 28' }));
    const button = screen.getByRole('button', { name: 'Hold to read verse 28' });
    expect(button).toHaveClass('bk-composer__bar', 'lp-bar');
    expect(button).toHaveAttribute('data-state', 'idle');
    fireEvent.pointerDown(button);
    fireEvent.pointerUp(button, { clientX: 10, clientY: 10 });
    expect(calls).toEqual(['press', 'release']);
    rerender(bar({ listening: true, label: 'Release to send' }));
    expect(screen.getByRole('button', { name: 'Release to send' })).toHaveAttribute('data-state', 'listening');
    rerender(bar({ listening: false, label: 'Hold to read verse 28', disabled: true }));
    expect(screen.getByRole('button', { name: 'Hold to read verse 28' })).toBeDisabled();
  });
});
