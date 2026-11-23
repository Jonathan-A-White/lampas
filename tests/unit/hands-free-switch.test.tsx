// The Hands-free switch (mw-rl10piw.5): src/handsFree/switch.ts writes the setting and says it; src/handsFree/HandsFreeGate.tsx draws the mark and holds the screen awake
// while it is On. This story opens no microphone, so getUserMedia is a spy that is never called. The whole of it, over the app, is features/hands-free.feature.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import { threeFingerTap } from 'voice-kit/testing/handsfree';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { HandsFreeGate } from '../../src/handsFree/HandsFreeGate';
import { getHandsFree, setHandsFree, toggleHandsFree } from '../../src/handsFree/switch';
import { stopAnswer, stopReading } from '../../src/speech/readAloud';
import { handsFreeSetting } from '../../src/settings/definitions/handsFree';
import { applyChanges, undoChange } from '../support/settings';
import { setSetting } from '../../src/settings/store';
import { ENGLISH_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';
import { readFileSync } from 'node:fs';
import type { Chapter } from '../../src/data/chapter';
import { answerRuns } from '../../src/speech/answerRuns';
import { speakTutor } from '../../src/speech/tutorVoice';
import { useTalk } from '../../src/useTalk';
import { serveWakeModel, stubWake, type WakeFake } from '../support/fake-wake';

const asked = vi.hoisted(() => vi.fn());
vi.mock('../../src/services/talk', async (original) => ({ ...(await original<typeof import('../../src/services/talk')>()), askTalk: asked }));
const wake = vi.hoisted(() => ({ holdAwake: vi.fn(), releaseAwake: vi.fn() }));
vi.mock('../../src/speech/wakeLock', async (original) => ({ ...(await original<typeof import('../../src/speech/wakeLock')>()), ...wake }));

const getUserMedia = vi.fn();
let synth: FakeSynth;
let wakeFake: WakeFake;

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
  // the session behind the gate starts its wake: an honest wake and its model served, or it would say, truthfully, that it could not start (mw-rl10piw.31)
  wakeFake = stubWake();
  serveWakeModel();
  await db.open();
  await db.settings.clear();
});

afterAll(() => {
  wakeFake.uninstall();
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

describe('the tutor changing Hands-free', () => {
  it('says so aloud, as the switch and the tap do', async () => {
    const result = await applyChanges([{ key: 'handsFree', value: 'on' }]);
    expect(result.applied).toHaveLength(1);
    expect(await getHandsFree()).toBe(true);
    await waitFor(() => expect(spoken()).toEqual(['Hands-free on']));
    await applyChanges([{ key: 'handsFree', value: 'off' }]);
    expect(await getHandsFree()).toBe(false);
    await waitFor(() => expect(spoken()).toEqual(['Hands-free on', 'Hands-free off']));
  });
});

describe('the tutor changing Hands-free spoken with the answer read aloud', () => {
  // mw-rl10piw.39: Settings > Read the tutor's responses aloud is On by default; the answer that changed the setting is read as it comes, and used to cut off 'Hands-free on' in the same instant
  const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
  const scope = { title: 'Romans 8', chapter, verse: null };
  const outcomes = (text: string): string[] => synth.honest.log.filter((e) => e.text === text).map((e) => e.outcome);

  for (const [value, said, answer] of [['on', 'Hands-free on', 'Done: Hands-free is on.'], ['off', 'Hands-free off', 'Done: Hands-free is off.']] as const) {
    it(`says '${said}' to its end, and reads the answer after it`, async () => {
      if (value === 'off') await setSetting(handsFreeSetting, 'on');
      asked.mockReset();
      asked.mockResolvedValue({ answer, words: [], settings_changes: [{ key: 'handsFree', value }] });
      const { result } = renderHook(() => useTalk('rom', 8, (_ref, id, text) => speakTutor(id, answerRuns(text))));
      act(() => result.current.say(scope, `Turn Hands-free ${value}`));
      await waitFor(() => expect(spoken()).toContain(said));
      // the sentence is not cut off: it plays out, and only then does the answer take the voice
      await waitFor(() => expect(synth.speaking).toBe(true));
      expect(spoken()).not.toContain(answer);
      synth.finishAll();
      await waitFor(() => expect(spoken()).toContain(answer));
      synth.finishAll();
      expect(outcomes(said)).toEqual(['ended']);
      expect(outcomes(answer)).toEqual(['ended']);
      expect(await getHandsFree()).toBe(value === 'on');
    });
  }
});

describe('Undo tapped while the setting sentence is spoken (mw-rl10piw.70)', () => {
  const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
  const scope = { title: 'Romans 8', chapter, verse: null };
  const answer = 'Done: Hands-free is on.';
  // 'Hands-free on' is said as the settings are applied, well before the answer is kept and handed to the voice (useTalk awaits the turn's writes between): a test that
  // stops or undoes what "waits" must wait until the answer has been handed over, or under load it acts first and the answer is read after (mw-rl10piw.70)
  let handed = 0;
  const handedOver = (_ref: string, id: number, text: string): void => {
    speakTutor(id, answerRuns(text));
    handed += 1;
  };
  beforeEach(() => {
    handed = 0;
  });

  it('undo while the setting sentence is spoken: the answer that waited on it is not read after Hands-free off', async () => {
    asked.mockReset();
    asked.mockResolvedValue({ answer, words: [], settings_changes: [{ key: 'handsFree', value: 'on' }] });
    const { result } = renderHook(() => useTalk('rom', 8, handedOver));
    act(() => result.current.say(scope, 'Turn Hands-free on'));
    await waitFor(() => expect(spoken()).toContain('Hands-free on'));
    await waitFor(() => expect(handed).toBe(1));
    await waitFor(() => expect(synth.speaking).toBe(true));
    // Undo is tapped before 'Hands-free on' has ended
    await act(async () => {
      await undoChange({ key: 'handsFree', label: 'Hands-free', from: 'off', to: 'on', shown: 'Hands-free: On' });
    });
    await waitFor(() => expect(spoken()).toContain('Hands-free off'));
    synth.finishAll();
    await act(async () => {});
    synth.finishAll();
    expect(await getHandsFree()).toBe(false);
    const log = synth.honest.log.map((e) => e.text);
    expect(log).toContain('Hands-free off');
    expect(log.slice(log.indexOf('Hands-free off') + 1)).not.toContain(answer);
  });

  it('a three-finger toggle that replaces the sentence drops the waiting answer too', async () => {
    asked.mockReset();
    asked.mockResolvedValue({ answer, words: [], settings_changes: [{ key: 'handsFree', value: 'on' }] });
    const { result } = renderHook(() => useTalk('rom', 8, handedOver));
    act(() => result.current.say(scope, 'Turn Hands-free on'));
    await waitFor(() => expect(spoken()).toContain('Hands-free on'));
    await waitFor(() => expect(handed).toBe(1));
    await act(async () => {
      await toggleHandsFree();
    });
    await waitFor(() => expect(synth.honest.log.map((e) => e.text)).toContain('Hands-free off'));
    synth.finishAll();
    await act(async () => {});
    synth.finishAll();
    expect(synth.honest.log.map((e) => e.text)).not.toContain(answer);
  });

  it('a new question gives up the waiting answer', async () => {
    asked.mockReset();
    asked.mockResolvedValue({ answer, words: [], settings_changes: [{ key: 'handsFree', value: 'on' }] });
    const { result } = renderHook(() => useTalk('rom', 8, handedOver));
    act(() => result.current.say(scope, 'Turn Hands-free on'));
    await waitFor(() => expect(spoken()).toContain('Hands-free on'));
    await waitFor(() => expect(handed).toBe(1));
    // a new question stops the answer (useTalk: stopAnswer), and what waits with it
    act(() => stopAnswer());
    synth.finishAll();
    await act(async () => {});
    synth.finishAll();
    expect(synth.honest.log.map((e) => e.text)).not.toContain(answer);
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
