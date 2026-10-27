// One pronunciation setting for both languages (mw-gdcyf98.6): Settings > Listening > Pronunciation is a family that sets Greek and Hebrew together (Modern: Modern Greek + Israeli
// Hebrew), 'Set each language on its own' shows the Greek and the Hebrew row instead, Hebrew has a voice and a speed of its own beside Greek's (voices-changed carries every
// language), and a Hebrew keyboard setting sits beside the Greek one.
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { getGreekPronunciation, getSpeechRates, getVoice } from '../../src/data/repositories';
import { clearBus, latest } from '../../src/events/bus';
import { hebrewKeyboardSetting, hebrewPronunciationSetting, pronunciationSeparateSetting, pronunciationSetting } from '../../src/settings/definitions';
import { ROWS, readValues, visibleRows, type Values } from '../../src/settings/rows';
import { settingOf, writeSetting } from '../../src/settings/registry';
import { getSetting } from '../../src/settings/store';
import { LANGUAGES } from '../../src/speech/languages';
import { speak } from '../../src/speech/greek';
import { startSpeechSettingsSync } from '../../src/speech/settingsSync';
import { HEBREW_VOICE, stubSpeech, type FakeVoice } from '../support/fake-speech';
import { ASYNC_WAIT_MS } from '../support/timeouts';

beforeEach(async () => {
  clearBus();
  await db.open();
  await db.settings.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const keysAt = (values: Values): string[] => visibleRows(values, '').map((r) => r.key);
/** The values the rows' dependencies read with both dials at the given steps, as readValues answers them. */
const valuesOf = async (greek: number, hebrew: number, separate: 'on' | 'off'): Promise<Values> => {
  await db.settings.bulkPut([
    { key: 'greekInterest', value: String(greek) },
    { key: 'hebrewInterest', value: String(hebrew) },
    { key: 'pronunciationSeparate', value: separate },
  ]);
  return readValues();
};

describe('the pronunciation family', () => {
  it('is Pronunciation, a choice with the one value modern, and the switch is Set each language on its own, off to start', () => {
    expect(pronunciationSetting.key).toBe('pronunciation');
    expect(pronunciationSetting.label).toBe('Pronunciation');
    expect(pronunciationSetting.section).toBe('pronunciation');
    expect(pronunciationSetting.allowed).toMatchObject({ kind: 'choice', values: [{ value: 'modern', label: 'Modern' }] });
    expect(pronunciationSeparateSetting.label).toBe('Set each language on its own');
    expect(pronunciationSeparateSetting.default).toBe('off');
    expect(pronunciationSeparateSetting.section).toBe('pronunciation');
    expect(hebrewPronunciationSetting.default).toBe('israeli');
  });

  it('writes both languages when the family is written', async () => {
    await writeSetting('greekPronunciation', 'modern');
    await db.settings.delete('greekPronunciation');
    await writeSetting('pronunciation', 'modern');
    expect(await getGreekPronunciation()).toBe('modern');
    expect(await getSetting(hebrewPronunciationSetting)).toBe('israeli');
    expect((await db.settings.get('hebrewPronunciation'))?.value).toBe('israeli');
    expect((await db.settings.get('greekPronunciation'))?.value).toBe('modern');
    expect(latest('pronunciation-changed')).toMatchObject({ pronunciation: 'modern' });
    expect(latest('setting-changed')).toMatchObject({ key: 'hebrewPronunciation', value: 'israeli' });
  });

  it('puts both languages back on the family when Set each language on its own is turned off', async () => {
    await writeSetting('pronunciationSeparate', 'on');
    await db.settings.bulkPut([
      { key: 'greekPronunciation', value: 'other' },
      { key: 'hebrewPronunciation', value: 'other' },
    ]);
    await writeSetting('pronunciationSeparate', 'off');
    expect((await db.settings.get('greekPronunciation'))?.value).toBe('modern');
    expect((await db.settings.get('hebrewPronunciation'))?.value).toBe('israeli');
    expect(await getSetting(pronunciationSeparateSetting)).toBe('off');
  });

  it('shows the family and the switch, not the two rows, while the switch is off; the two rows, not the family, while it is on', async () => {
    const off = keysAt(await valuesOf(5, 5, 'off'));
    expect(off).toEqual(expect.arrayContaining(['pronunciation', 'pronunciationSeparate']));
    expect(off).not.toContain('greekPronunciation');
    expect(off).not.toContain('hebrewPronunciation');
    const on = keysAt(await valuesOf(5, 5, 'on'));
    expect(on).toEqual(expect.arrayContaining(['pronunciationSeparate', 'greekPronunciation', 'hebrewPronunciation']));
    expect(on).not.toContain('pronunciation');
  });

  it("shows a language's own row only while its dial is at Curious or above", async () => {
    const hebrewOnly = keysAt(await valuesOf(0, 1, 'on'));
    expect(hebrewOnly).toContain('hebrewPronunciation');
    expect(hebrewOnly).not.toContain('greekPronunciation');
    const greekOnly = keysAt(await valuesOf(1, 0, 'on'));
    expect(greekOnly).toContain('greekPronunciation');
    expect(greekOnly).not.toContain('hebrewPronunciation');
    const english = keysAt(await valuesOf(0, 0, 'on'));
    expect(english).not.toEqual(expect.arrayContaining(['pronunciation']));
    expect(english).not.toContain('pronunciationSeparate');
  });
});

describe('the Hebrew voice, speed and keyboard', () => {
  it('is a language of LANGUAGES, so it has a voice row and a speed row beside the Greek ones, from Hebrew Curious', async () => {
    expect(LANGUAGES.find((l) => l.id === 'hebrew')).toMatchObject({ label: 'Hebrew', lang: 'he-IL' });
    expect(settingOf('hebrewVoice')?.label).toBe('Hebrew voice');
    expect(settingOf('hebrewRate')?.label).toBe('Hebrew speed');
    const hebrew = keysAt(await valuesOf(0, 1, 'off'));
    expect(hebrew).toEqual(expect.arrayContaining(['hebrewVoice', 'hebrewRate', 'hebrewKeyboard']));
    expect(hebrew).not.toContain('greekVoice');
    expect(hebrew).not.toContain('greekRate');
    expect(hebrew).not.toContain('greekKeyboard');
    const greek = keysAt(await valuesOf(1, 0, 'off'));
    expect(greek).toEqual(expect.arrayContaining(['greekVoice', 'greekRate', 'greekKeyboard']));
    expect(greek).not.toContain('hebrewVoice');
    expect(greek).not.toContain('hebrewRate');
    expect(greek).not.toContain('hebrewKeyboard');
    const english = keysAt(await valuesOf(0, 0, 'off'));
    expect(english.filter((k) => k.startsWith('hebrew'))).toEqual([]);
  });

  it('has a Hebrew keyboard row like the Greek one: section daily, On | Off, Off to start', () => {
    expect(hebrewKeyboardSetting.key).toBe('hebrewKeyboard');
    expect(hebrewKeyboardSetting.section).toBe('daily');
    expect(hebrewKeyboardSetting.default).toBe('off');
    expect(hebrewKeyboardSetting.allowed).toMatchObject({ kind: 'choice', values: [{ value: 'on' }, { value: 'off' }] });
    expect(ROWS.find((r) => r.key === 'hebrewKeyboard')?.section).toBe('daily');
  });

  it('saves the Hebrew voice and tells the bus every language in voices-changed', async () => {
    await writeSetting('greekVoice', 'greek-uri');
    await writeSetting('hebrewVoice', 'hebrew-uri');
    expect(await getVoice('hebrew')).toBe('hebrew-uri');
    expect(latest('voices-changed')).toEqual({ kind: 'voices-changed', voices: { english: null, greek: 'greek-uri', hebrew: 'hebrew-uri' } });
    await writeSetting('hebrewVoice', 'default');
    expect(latest('voices-changed')).toMatchObject({ voices: { greek: 'greek-uri', hebrew: null } });
  });

  it('saves the Hebrew speed and tells the bus every language in rates-changed', async () => {
    await writeSetting('hebrewRate', 0.7);
    expect((await getSpeechRates()).hebrew).toBe(0.7);
    expect(latest('rates-changed')).toMatchObject({ rates: { english: 1, greek: 1, hebrew: 0.7 } });
  });

  it('speaks a Hebrew word at the Hebrew speed in the chosen Hebrew voice, read from the store', async () => {
    const chosen: FakeVoice = { lang: 'he-IL', name: 'Carmit', voiceURI: 'carmit' };
    const synth = stubSpeech([HEBREW_VOICE, chosen]);
    await db.settings.bulkPut([
      { key: 'voice.hebrew', value: 'carmit' },
      { key: 'rate.hebrew', value: '0.7' },
    ]);
    const stop = startSpeechSettingsSync();
    const timeout = ASYNC_WAIT_MS;
    await vi.waitFor(() => expect(latest('voices-changed')).toMatchObject({ voices: { hebrew: 'carmit' } }), { timeout });
    expect(speak('שָׁלוֹם', 'he:test', 'hebrew')).toBe('speaking');
    stop();
    expect(synth.spoken).toHaveLength(1);
    expect(synth.spoken[0].lang).toBe('he-IL');
    expect(synth.spoken[0].rate).toBe(0.7);
    expect(synth.spoken[0].voice?.name).toBe('Carmit');
  });
});
