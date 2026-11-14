// The Hands-free switch (mw-rl10piw.5): src/handsFree/switch.ts writes the setting and says it; src/handsFree/HandsFreeGate.tsx draws the mark and holds the screen awake
// while it is On. This story opens no microphone, so getUserMedia is a spy that is never called. The whole of it, over the app, is features/hands-free.feature.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { threeFingerTap } from 'voice-kit/testing/handsfree';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { HandsFreeGate } from '../../src/handsFree/HandsFreeGate';
import { getHandsFree, setHandsFree, toggleHandsFree } from '../../src/handsFree/switch';
import { stopReading } from '../../src/speech/readAloud';
import { handsFreeSetting } from '../../src/settings/definitions';
import { setSetting } from '../../src/settings/store';
import { ENGLISH_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';

const wake = vi.hoisted(() => ({ holdAwake: vi.fn(), releaseAwake: vi.fn() }));
vi.mock('../../src/speech/wakeLock', async (original) => ({ ...(await original<typeof import('../../src/speech/wakeLock')>()), ...wake }));

const getUserMedia = vi.fn();
let synth: FakeSynth;

beforeEach(async () => {
  cleanup();
  clearBus();
  stopReading();
  vi.unstubAllGlobals();
  wake.holdAwake.mockClear();
  wake.releaseAwake.mockClear();
  getUserMedia.mockClear();
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  synth = stubSpeech([ENGLISH_VOICE]);
  await db.open();
  await db.settings.clear();
});

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

const spoken = (): string[] => synth.spoken.map((s) => s.text);

describe('the Hands-free switch', () => {
  it('is Off to start', async () => {
    expect(await getHandsFree()).toBe(false);
    expect(handsFreeSetting.default).toBe('off');
  });

  it('writes the setting and says so, in the English voice, through toggleHandsFree', async () => {
    await toggleHandsFree();
    expect(await getHandsFree()).toBe(true);
    await waitFor(() => expect(synth.spoken.map((s) => [s.text, s.lang])).toEqual([['Hands-free on', 'en-US']]));
    await toggleHandsFree();
    expect(await getHandsFree()).toBe(false);
    await waitFor(() => expect(spoken()).toEqual(['Hands-free on', 'Hands-free off']));
  });

  it('says nothing when the setting is set to what it already is', async () => {
    await setHandsFree(false);
    expect(spoken()).toEqual([]);
  });
});

describe('the Hands-free gate', () => {
  it('holds the screen awake as hands-free while On and lets go when Off', async () => {
    render(<HandsFreeGate />);
    await act(async () => {});
    expect(wake.holdAwake).not.toHaveBeenCalled();
    await act(async () => {
      await setSetting(handsFreeSetting, 'on');
    });
    await waitFor(() => expect(wake.holdAwake).toHaveBeenCalledWith('hands-free'));
    expect(screen.getByRole('img', { name: 'Hands-free is on' })).toBeInTheDocument();
    await act(async () => {
      await setSetting(handsFreeSetting, 'off');
    });
    await waitFor(() => expect(wake.releaseAwake).toHaveBeenCalledWith('hands-free'));
    expect(screen.queryByRole('img', { name: 'Hands-free is on' })).toBeNull();
  });

  it('holds it from the start when the saved setting is On, and says nothing', async () => {
    await db.settings.put({ key: 'handsFree', value: 'on' });
    render(<HandsFreeGate />);
    await waitFor(() => expect(wake.holdAwake).toHaveBeenCalledWith('hands-free'));
    expect(spoken()).toEqual([]);
  });

  it('is turned On and Off by a three-finger tap anywhere, and leaves a thing with finger gestures of its own alone', async () => {
    render(
      <div>
        <HandsFreeGate />
        <p data-testid="text">some text</p>
        <div data-two-finger data-testid="map">
          a map
        </div>
      </div>,
    );
    await act(async () => {});
    act(() => threeFingerTap(screen.getByTestId('map')));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50)); // a real-time wait: nothing must happen in this window (a tap over a map is left alone)
    });
    expect(await getHandsFree()).toBe(false);
    expect(spoken()).toEqual([]);

    act(() => threeFingerTap(screen.getByTestId('text')));
    await waitFor(async () => expect(await getHandsFree()).toBe(true));
    await waitFor(() => expect(screen.getByRole('img', { name: 'Hands-free is on' })).toBeInTheDocument());
    await waitFor(() => expect(spoken()).toEqual(['Hands-free on']));
    act(() => threeFingerTap(document.body));
    await waitFor(async () => expect(await getHandsFree()).toBe(false));
    await waitFor(() => expect(spoken()).toEqual(['Hands-free on', 'Hands-free off']));
  });

  it('never opens a microphone', async () => {
    render(<HandsFreeGate />);
    await toggleHandsFree();
    await waitFor(() => expect(wake.holdAwake).toHaveBeenCalled());
    await toggleHandsFree();
    await waitFor(() => expect(wake.releaseAwake).toHaveBeenCalled());
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});
