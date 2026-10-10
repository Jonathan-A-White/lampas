// tests/unit/speaking-bar.test.tsx — where the one speaking bar is drawn (src/speech/SpeakingBarSlot.tsx): while a reading or an answer is read, in
// the highest slot on screen; never for a word said alone.
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearBus } from '../../src/events/bus';
import { speakWord } from '../../src/speech/greek';
import { startAnswer, stopReading } from '../../src/speech/readAloud';
import { BarSlot, LampasSpeakingBar } from '../../src/speech/SpeakingBarSlot';
import { ENGLISH_VOICE, GREEK_VOICE, type FakeSynth, stubSpeech } from '../support/fake-speech';

let synth: FakeSynth;
beforeEach(() => {
  clearBus();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
});
afterEach(() => {
  act(() => stopReading());
  cleanup();
  vi.unstubAllGlobals();
});

const bar = () => screen.queryByRole('region', { name: 'Speaking' });
const answer = () => startAnswer(1, [{ text: 'An answer. In two sentences.', language: 'english' }]);

describe('the speaking bar', () => {
  it('shows nothing while nothing is read', () => {
    render(<><BarSlot level={0} /><LampasSpeakingBar /></>);
    expect(bar()).toBeNull();
  });

  it('shows for a tutor answer read aloud and goes when it is over', () => {
    render(<><BarSlot level={0} /><LampasSpeakingBar /></>);
    act(() => answer());
    expect(bar()).not.toBeNull();
    act(() => synth.finishAll());
    expect(bar()).toBeNull();
  });

  it('is not shown for a word said alone', () => {
    render(<><BarSlot level={0} /><LampasSpeakingBar /></>);
    act(() => void speakWord('λόγος', 'greek'));
    expect(synth.speaking).toBe(true);
    expect(bar()).toBeNull();
  });

  it('is drawn in the highest slot on screen, and moves to the one below when that goes', () => {
    const { rerender } = render(
      <>
        <div data-testid="shell"><BarSlot level={0} /></div>
        <div data-testid="sheet"><BarSlot level={3} /></div>
        <LampasSpeakingBar />
      </>,
    );
    act(() => answer());
    expect(within(screen.getByTestId('sheet')).queryByRole('region', { name: 'Speaking' })).not.toBeNull();
    expect(within(screen.getByTestId('shell')).queryByRole('region', { name: 'Speaking' })).toBeNull();
    rerender(
      <>
        <div data-testid="shell"><BarSlot level={0} /></div>
        <LampasSpeakingBar />
      </>,
    );
    expect(within(screen.getByTestId('shell')).queryByRole('region', { name: 'Speaking' })).not.toBeNull();
  });
});

describe('a page that hides', () => {
  const hide = () => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  };

  it('ends a word said alone (it has no bar to Resume from)', () => {
    act(() => void speakWord('λόγος', 'greek'));
    act(hide);
    expect(synth.speaking).toBe(false);
    expect(synth.calls[synth.calls.length - 1]).toBe('cancel');
  });

  it('only pauses a reading: its bar offers Resume', () => {
    render(<><BarSlot level={0} /><LampasSpeakingBar /></>);
    act(() => answer());
    act(hide);
    expect(within(screen.getByRole('region', { name: 'Speaking' })).getAllByRole('button').map((b) => b.textContent)).toEqual(['Resume', 'Restart', 'Stop']);
  });
});
