// The sermon sources the index service has that the bundle lacks (mw-qtu3zvz.5, src/data/repositories/sermonSources.ts, src/sermons/known.ts, docs/sermons.md 'When online'): the kept list, the first time a source is seen,
// and the On | Off row Settings grows for each (src/settings/rows.ts growSermonRows), which the tutor is not told of.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { getKnownSermonSources, rememberSermonSources, type KnownSermonSource } from '../../src/data/repositories';
import { knownSermonSources, setKnownSermonSources } from '../../src/sermons/known';
import { enabledServiceSources, latestFor, forgetServiceSources } from '../../src/sermons';
import { settingOf } from '../../src/settings/registry';
import { forgetGrownSermonRows, isTalkable, rowOf, ROWS } from '../../src/settings/rows';
import { settingsForTutor } from '../../src/settings/tutorSettings';
import { setSermonsUrl } from '../../src/services/sermons';
import { registerTestSermons, forgetTestSermons } from '../support/test-sermons';

const NEW: KnownSermonSource = { id: 'newbie-sermons', name: 'Newbie’s sermons', credit: 'The Newbie Collection', homepage: 'https://newbie.example', onByDefault: false };
const ON: KnownSermonSource = { id: 'always-sermons', name: 'Always sermons', credit: 'Always Credit', homepage: 'https://always.example', onByDefault: true };

beforeEach(async () => {
  await db.open();
  await Promise.all([db.meta.clear(), db.settings.clear()]);
  forgetGrownSermonRows();
  setKnownSermonSources([]);
});
afterEach(() => {
  forgetGrownSermonRows();
  setKnownSermonSources([]);
  forgetTestSermons();
  setSermonsUrl(undefined);
  forgetServiceSources();
});

describe('the kept list', () => {
  it('is empty at first, keeps a source the first time it is seen and says it was fresh', async () => {
    expect(await getKnownSermonSources()).toEqual([]);
    expect(await rememberSermonSources([NEW])).toEqual([NEW]);
    expect(await getKnownSermonSources()).toEqual([NEW]);
  });

  it('says nothing is fresh the second time, adds a later source at the end, and refreshes the details of one it knows', async () => {
    await rememberSermonSources([NEW]);
    expect(await rememberSermonSources([NEW])).toEqual([]);
    const renamed = { ...NEW, name: 'Newbie’s sermons, renamed' };
    expect(await rememberSermonSources([renamed, ON, ON])).toEqual([ON]);
    expect((await getKnownSermonSources()).map((k) => [k.id, k.name])).toEqual([
      ['newbie-sermons', 'Newbie’s sermons, renamed'],
      ['always-sermons', 'Always sermons'],
    ]);
  });

  it('reads a kept list that is damaged as none', async () => {
    await db.meta.put({ key: 'sermonSources', value: '{not json' });
    expect(await getKnownSermonSources()).toEqual([]);
    await db.meta.put({ key: 'sermonSources', value: JSON.stringify([{ id: 'x' }, NEW]) });
    expect(await getKnownSermonSources()).toEqual([NEW]);
  });
});

describe('the Settings rows', () => {
  it('a known source grows an On | Off row at the end of the Sermons section, Off to start, once', () => {
    const before = ROWS.filter((r) => r.section === 'sermons').length;
    setKnownSermonSources([NEW]);
    setKnownSermonSources([NEW]);
    const rows = ROWS.filter((r) => r.section === 'sermons');
    expect(rows).toHaveLength(before + 1);
    expect(rows.at(-1)).toMatchObject({ key: 'sermons.newbie-sermons', label: 'Newbie’s sermons' });
    expect(rowOf('sermons.newbie-sermons')).toBeDefined();
  });

  it('is read and saved like any switch: Off to start, On when the service says on_by_default, and a saved choice wins', async () => {
    setKnownSermonSources([NEW, ON]);
    expect(await settingOf('sermons.newbie-sermons')!.read()).toBe('off');
    expect(await settingOf('sermons.always-sermons')!.read()).toBe('on');
    await settingOf('sermons.newbie-sermons')!.write('on');
    expect((await db.settings.get('sermons.newbie-sermons'))?.value).toBe('on');
    expect((await enabledServiceSources()).map((s) => s.id)).toEqual(['newbie-sermons', 'always-sermons']);
    await settingOf('sermons.always-sermons')!.write('off');
    expect((await enabledServiceSources()).map((s) => s.id)).toEqual(['newbie-sermons']);
  });

  it('is not told to the tutor and not flipped by talk', async () => {
    setKnownSermonSources([NEW]);
    expect(isTalkable('sermons.newbie-sermons')).toBe(false);
    expect((await settingsForTutor()).map((s) => s.name)).not.toContain(NEW.name);
  });

  it('forgetting the grown rows takes them out', () => {
    setKnownSermonSources([NEW]);
    forgetGrownSermonRows();
    expect(rowOf('sermons.newbie-sermons')).toBeUndefined();
    expect(settingOf('sermons.newbie-sermons')).toBeUndefined();
    expect(knownSermonSources()).toHaveLength(1);
  });
});

describe('asking the service with no address', () => {
  it('is nothing: no service, no request', async () => {
    registerTestSermons();
    setSermonsUrl('');
    expect(await latestFor({ book: 'rom', chapter: 5, from: 8 }, { here: [], chapter: [] })).toBeUndefined();
  });
});
