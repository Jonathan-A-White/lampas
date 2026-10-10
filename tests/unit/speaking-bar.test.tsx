// tests/unit/speaking-bar.test.tsx — where the one speaking bar is drawn (src/speech/SpeakingBarSlot.tsx): while a reading or an answer is read, in
// the highest slot on screen; never for a word said alone.
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearBus } from '../../src/events/bus';
import { getSpeech } from 'bsv-kit/speech';
import { speak, speakWord, stopSpeaking, watchWordEnd } from '../../src/speech/greek';
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

describe('a word said while a reading is under way', () => {
  const buttons = () => within(screen.getByRole('region', { name: 'Speaking' })).getAllByRole('button').map((b) => b.textContent);
  const reading = () => startAnswer(1, [{ text: 'First sentence. Second sentence. Third sentence.', language: 'english' }]);

  it('pauses the reading where it was and is said beside it', () => {
    render(<><BarSlot level={0} /><LampasSpeakingBar /></>);
    act(() => reading());
    act(() => synth.finish());
    act(() => void speakWord('λόγος', 'greek'));
    expect(buttons()).toEqual(['Resume', 'Restart', 'Stop']);
    expect(synth.since.map((u) => u.text)).toEqual(['λόγος']);
    expect(getSpeech()).toMatchObject({ key: 'read-aloud', status: 'paused', index: 1 });
  });

  it('lets Resume go on from the sentence it was in once the word is over', () => {
    render(<><BarSlot level={0} /><LampasSpeakingBar /></>);
    act(() => reading());
    act(() => synth.finish());
    act(() => void speakWord('λόγος', 'greek'));
    act(() => synth.finishAll());
    const before = synth.spoken.length;
    act(() => void screen.getByRole('button', { name: 'Resume' }).click());
    expect(synth.spoken.slice(before).map((u) => u.text)).toEqual(['Second sentence.', 'Third sentence.']);
  });

  it('leaves a reading he had paused paused, and says the word', () => {
    render(<><BarSlot level={0} /><LampasSpeakingBar /></>);
    act(() => reading());
    act(() => void screen.getByRole('button', { name: 'Pause' }).click());
    act(() => void speakWord('λόγος', 'greek'));
    expect(buttons()).toEqual(['Resume', 'Restart', 'Stop']);
    expect(synth.speaking).toBe(true);
  });

  it('is told apart from the reading: watchWordEnd, a second tap and stopSpeaking see only the word', () => {
    const done = vi.fn();
    act(() => reading());
    act(() => void speakWord('λόγος', 'greek'));
    watchWordEnd(done);
    expect(done).not.toHaveBeenCalled();
    act(() => synth.finishAll());
    expect(done).toHaveBeenCalledTimes(1);

    act(() => void speakWord('λόγος', 'greek'));
    act(() => stopSpeaking());
    expect(synth.speaking).toBe(false);
    expect(getSpeech()).toMatchObject({ key: 'read-aloud', status: 'paused' });

    expect(speak('λόγος', 'speaker-1')).toBe('speaking');
    expect(speak('λόγος', 'speaker-1')).toBe('stopped');
    expect(synth.speaking).toBe(false);
    expect(getSpeech().status).toBe('paused');
  });

  it('is cut off by the next word without ending the reading', () => {
    act(() => reading());
    act(() => void speakWord('λόγος', 'greek'));
    act(() => void speakWord('ἀγάπη', 'greek'));
    expect(synth.since.map((u) => u.text)).toEqual(['ἀγάπη']);
    expect(getSpeech().status).toBe('paused');
    act(() => synth.finishAll());
    expect(getSpeech().status).toBe('paused');
  });

  it('is ended with the reading by Stop on the bar', () => {
    render(<><BarSlot level={0} /><LampasSpeakingBar /></>);
    act(() => reading());
    act(() => void speakWord('λόγος', 'greek'));
    act(() => void screen.getByRole('button', { name: 'Stop' }).click());
    expect(synth.speaking).toBe(false);
    expect(bar()).toBeNull();
  });

  it('with no reading is a plain word, with no bar', () => {
    render(<><BarSlot level={0} /><LampasSpeakingBar /></>);
    act(() => void speakWord('λόγος', 'greek'));
    expect(bar()).toBeNull();
    expect(getSpeech().key).toBe('word-press');
  });
});
