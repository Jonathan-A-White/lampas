// tests/unit/chapter-place.test.tsx — the Reader's own Play (a chapter read aloud) keeps where he stopped across leaving the screen (mw-5r3p30.1239), the way Play all
// does (src/speech/passagePlace.ts, mw-5r3p30.1236): opening the chapter again offers 'Resume · John 1:3' and goes on from that verse. The engine is the honest fake on a manual clock.
import { readFileSync } from 'node:fs';
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { clearBus } from '../../src/events/bus';
import { useReadFrom } from '../../src/reader/useReadFrom';
import { chapterKey, getPlace } from '../../src/speech/passagePlace';
import { getReading, stopReading } from '../../src/speech/readAloud';
import { resetRecordedVoice, setBibleVoice } from '../../src/speech/recordedVoice';
import { ResumeOffer } from '../../src/speech/ReadControls';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';

const chapter = { ...(JSON.parse(readFileSync('public/data/jhn/1.json', 'utf8')) as Chapter), translation: 'msb', source: 'grc' } as Chapter;
let synth: FakeSynth;

beforeEach(() => {
  window.localStorage.clear();
  clearBus();
  resetRecordedVoice();
  setBibleVoice('phone');
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
});
afterEach(() => {
  cleanup();
  stopReading();
  resetRecordedVoice();
  vi.unstubAllGlobals();
});

const open = (chapterN = 1) => renderHook(() => useReadFrom('jhn', chapterN, chapter, 'english', null, undefined));
/** Lets the voice read on until it is at `verse`. */
function readUntil(verse: number): void {
  for (let i = 0; i < 40 && getReading().verse !== verse; i++) act(() => synth.finish());
  expect(getReading().verse).toBe(verse);
}

describe('the Reader’s Play keeps its place (mw-5r3p30.1239)', () => {
  it('a chapter left mid-way is offered again at the verse it was at', () => {
    const first = open();
    expect(first.result.current.kept).toBeNull();
    act(() => first.result.current.readFrom(1, true, false));
    readUntil(3);
    // leaving the screen: the Reader pauses the reading and the hook goes
    act(() => first.unmount());
    stopReading();
    const again = open();
    expect(again.result.current.kept).toMatchObject({ verse: 3, label: 'John 1:3' });
    act(() => again.result.current.resumeKept());
    expect(getReading()).toMatchObject({ status: 'reading', verse: 3 });
  });

  it('a Stop keeps the place too, and From the start forgets it', () => {
    const screenOne = open();
    act(() => screenOne.result.current.readFrom(1, true, false));
    readUntil(2);
    act(() => stopReading());
    expect(screenOne.result.current.kept).toMatchObject({ verse: 2 });
    act(() => screenOne.result.current.fromTheStart());
    expect(getReading()).toMatchObject({ status: 'reading', verse: 1 });
    expect(getPlace(chapterKey('jhn', 1))).toMatchObject({ verse: 1 });
    expect(screenOne.result.current.kept).toBeNull();
  });

  it('a chapter read to its end keeps nothing', () => {
    const screenOne = open();
    act(() => screenOne.result.current.readFrom(chapter.verses.length - 1, true, false));
    for (let i = 0; i < 10 && getReading().status !== 'idle'; i++) act(() => synth.finish());
    expect(getReading().status).toBe('idle');
    expect(getPlace(chapterKey('jhn', 1))).toBeNull();
  });

  it('one verse’s play button keeps no place', () => {
    const screenOne = open();
    act(() => screenOne.result.current.readFrom(4, false, false));
    act(() => stopReading());
    expect(getPlace(chapterKey('jhn', 1))).toBeNull();
  });

  it('a place of another chapter is not offered here', () => {
    const screenOne = open();
    act(() => screenOne.result.current.readFrom(1, true, false));
    readUntil(3);
    act(() => stopReading());
    expect(open(2).result.current.kept).toBeNull();
  });
});

describe('the offer', () => {
  it('says Resume · <place> and From the start, and each does its own', async () => {
    const resume = vi.fn();
    const start = vi.fn();
    render(<ResumeOffer kept={{ heading: 'John 1', verse: 3, label: 'John 1:3' }} onResume={resume} onStart={start} />);
    await userEvent.click(screen.getByRole('button', { name: /Resume · John 1:3/ }));
    expect(resume).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'From the start' }));
    expect(start).toHaveBeenCalledTimes(1);
  });
});
