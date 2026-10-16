// A saved setting never changes on an update, a refresh or a migration (mw-5r3p30.146). Every registry setting is saved at a value that is not
// its default, the database is put back as an old phone had it (version 3) and opened again so every Dexie upgrade runs, the app's start
// (startSpeechSettingsSync) and the speech engine run, and each setting must read back what was saved and the settings table must hold
// the very rows it held.
import Dexie from 'dexie';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { db } from '../../src/data/db';
import { getSpeechRates } from '../../src/data/repositories';
import { clearBus, latest } from '../../src/events/bus';
import { SETTINGS, type SettingEntry, type SettingValue } from '../../src/settings/registry';
import { speak, speakWord, stopSpeaking } from '../../src/speech/greek';
import { startSpeechSettingsSync } from '../../src/speech/settingsSync';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech } from '../support/fake-speech';

afterEach(() => vi.unstubAllGlobals());
afterAll(() => db.close());

const byKey = (a: { key: string }, b: { key: string }) => a.key.localeCompare(b.key);
const rows = async () => (await db.settings.toArray()).sort(byKey);

/** A value the setting allows that is not the one it holds now. */
async function otherValue(entry: SettingEntry): Promise<SettingValue> {
  const now = await entry.read();
  const { allowed } = entry;
  if (allowed.kind === 'choice') {
    const other = allowed.values.find((v) => v.value !== now && v.value !== 'default');
    // a voice he chose is its voiceURI, which a talk cannot name: the only choice listed is the phone's own
    return other ? other.value : 'urn:voice:chosen-by-him';
  }
  if (allowed.kind === 'number') return now === allowed.min ? allowed.max : allowed.min;
  return allowed.example;
}

describe('no upgrade, start or speech rewrites a saved setting', () => {
  let saved: Record<string, SettingValue>;
  let before: Awaited<ReturnType<typeof rows>>;

  beforeAll(async () => {
    await db.open();
    await db.settings.clear();
    saved = {};
    for (const entry of SETTINGS) {
      const value = await otherValue(entry);
      await entry.write(value);
      saved[entry.key] = await entry.read();
    }
    before = await rows();
    // the phone as it was at version 3: the settings table and nothing the later versions added
    db.close();
    await Dexie.delete('lampas');
    const old = new Dexie('lampas');
    old.version(3).stores({ words: 'lemma, lesson, state, *lemmas', meta: 'key', settings: 'key' });
    await old.open();
    await old.table('settings').bulkPut(before);
    old.close();
    // every upgrade from 3 to the current version runs on this open
    await db.open();
  });

  it('keeps every setting, saved away from its default, through every Dexie upgrade', async () => {
    expect(db.verno).toBe(22);
    expect(await rows()).toEqual(before);
    for (const entry of SETTINGS) expect(await entry.read(), entry.key).toEqual(saved[entry.key]);
  });

  it('saves a Greek speed of 0.5 and an English speed of 1 and reads 0.5 and 1 back after the upgrades and the start', async () => {
    await db.settings.bulkPut([
      { key: 'rate.greek', value: '0.5' },
      { key: 'rate.english', value: '1' },
    ]);
    db.close();
    await db.open();
    clearBus();
    const stop = startSpeechSettingsSync();
    await waitFor(() => expect(latest('rates-changed')?.rates).toEqual({ english: 1, greek: 0.5 }));
    stop();
    expect(await getSpeechRates()).toEqual({ english: 1, greek: 0.5 });
  });

  it('keeps every setting through the app starting its speech settings and the speech engine speaking', async () => {
    const synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
    const start = await rows();
    clearBus();
    const stop = startSpeechSettingsSync();
    await waitFor(() => expect(latest('pronunciation-changed')).toBeDefined());
    act(() => void speakWord('λόγος', 'greek'));
    act(() => stopSpeaking());
    act(() => void speak('In the beginning', 'reading', 'english'));
    act(() => stopSpeaking());
    expect(synth.spoken.length).toBeGreaterThan(0);
    stop();
    expect(await rows()).toEqual(start);
    expect((await db.settings.get('rate.greek'))?.value).toBe('0.5');
    expect((await db.settings.get('rate.english'))?.value).toBe('1');
  });
});
