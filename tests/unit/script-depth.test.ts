// Hebrew in the tutor (mw-5r3p30.97): the depth he picks (Settings > Hebrew in the tutor) is kept per language, so Greek or a Hebrew reader
// can reuse the same code; it is a registry setting, and the verse-ask request carries it.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { getScriptDepth, setScriptDepth } from '../../src/data/repositories';
import { clearBus, latest } from '../../src/events/bus';
import { depthSettings } from '../../src/script/depthSettings';
import { DEFAULT_DEPTH, DEPTHS, SCRIPTS } from '../../src/script/scripts';
import { applyChanges, currentSettings, settingOf, undoChange, writeSetting } from '../../src/settings/registry';
import { buildRequest } from '../../src/services/tutor';

afterAll(() => db.close());

beforeEach(async () => {
  clearBus();
  await db.open();
  await db.settings.clear();
});

const he = SCRIPTS.find((s) => s.id === 'he')!;

describe('the Hebrew depth setting', () => {
  it('is Hebrew in the tutor, with Transliteration, Hebrew and transliteration, and Full', () => {
    const entry = settingOf('hebrewDepth');
    expect(entry?.label).toBe('Hebrew in the tutor');
    expect(entry?.allowed).toEqual({
      kind: 'choice',
      values: [
        { value: 'transliteration', label: 'Transliteration' },
        { value: 'both', label: 'Hebrew and transliteration' },
        { value: 'full', label: 'Full' },
      ],
    });
    expect(DEPTHS.map((d) => d.id)).toEqual(['transliteration', 'both', 'full']);
  });

  it('is Hebrew and transliteration until he chooses', async () => {
    expect(DEFAULT_DEPTH).toBe('both');
    expect(await getScriptDepth(he)).toBe('both');
    expect(await settingOf('hebrewDepth')?.read()).toBe('both');
    expect((await currentSettings()).hebrewDepth).toBe('both');
  });

  it('keeps each of the three values across a reload of the database', async () => {
    for (const depth of ['transliteration', 'full', 'both'] as const) {
      await setScriptDepth(he, depth);
      db.close();
      await db.open();
      expect(await getScriptDepth(he)).toBe(depth);
    }
  });

  it('falls back to the default for a saved value that is not one of the three', async () => {
    await db.settings.put({ key: 'hebrewDepth', value: 'everything' });
    expect(await getScriptDepth(he)).toBe('both');
  });

  it('is written through the registry (the Settings screen and the tutor), told to the bus, and undone', async () => {
    await writeSetting('hebrewDepth', 'full');
    expect(await getScriptDepth(he)).toBe('full');
    expect(latest('script-depth-changed')).toEqual({ kind: 'script-depth-changed', script: 'he', depth: 'full' });
    const { applied, refused } = await applyChanges([
      { key: 'hebrewDepth', value: 'transliteration' },
      { key: 'hebrewDepth', value: 'pointed' },
    ]);
    expect(refused).toHaveLength(1);
    expect(await getScriptDepth(he)).toBe('transliteration');
    await undoChange(applied[0]);
    expect(await getScriptDepth(he)).toBe('full');
  });
});

describe('the depth in a request', () => {
  it('depthSettings names each language\'s setting by its key', async () => {
    await setScriptDepth(he, 'transliteration');
    expect(await depthSettings()).toEqual({ hebrewDepth: 'transliteration' });
  });

  it('puts settings.hebrewDepth in the verse-ask request, and leaves settings out when none is given', () => {
    const verse = { n: 1, g: [{ t: 'λόγος' }], e: [{ t: 'word', g: [0] }] } as unknown as Parameters<typeof buildRequest>[1];
    const request = buildRequest('John 1:1', verse, 'What is this?', [], undefined, undefined, { hebrewDepth: 'full' });
    expect(request.settings).toEqual({ hebrewDepth: 'full' });
    expect(buildRequest('John 1:1', verse, 'What is this?', []).settings).toBeUndefined();
  });
});
