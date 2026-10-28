// tests/unit/reading-sets.test.ts — the reading sets kept on the phone (mw-9ji6ek0.23): the Dexie table `readingSets` added at version 33, the unit keys, the pure
// readingOf of the three built-in sets (Byzantine, NA, ECM) and of his own, and the repository that keeps them (choose, seed Mine, save as, rename, delete, switch).
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Chapter, VariantUnit } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import {
  chooseReading,
  deleteSet,
  getActiveSet,
  listReadingSets,
  renameSet,
  saveSetAs,
  setActive,
} from '../../src/data/repositories';
import { BASE, BYZANTINE, ECM, NA, readingOf, sharingKeys, unitKey, unitKeys } from '../../src/reader/readingSets';

const chapterOf = (book: string, n: number): Chapter => JSON.parse(readFileSync(`public/data/${book}/${n}.json`, 'utf8')) as Chapter;
const rev3 = chapterOf('rev', 3);
const unitAt = (chapter: Chapter, v: number, base: string): VariantUnit => {
  const unit = chapter.variants?.find((u) => u.v === v && u.base === base);
  if (!unit) throw new Error(`no unit ${v} ${base}`);
  return unit;
};
/** Rev 3:2 'ἔμελλες ἀποβάλλειν': B, B, N: the text's own, two Byzantine alternatives, NA's */
const dying = unitAt(rev3, 2, 'ἔμελλες ἀποβάλλειν');
/** Rev 3:7 'ἀνοίξει': N only */
const opens = unitAt(rev3, 7, 'ἀνοίξει');
const synthetic = (v: number, base: string, alts: VariantUnit['alts'], w: number[] = [0]): VariantUnit => ({
  v,
  w,
  base,
  alts,
  english: { source: 'lampas', base, alts: alts.map((a) => a.text) },
  changesEnglish: true,
  witness: 'na',
});

beforeEach(async () => {
  await db.open();
  await db.readingSets.clear();
  await db.settings.delete('readingSet');
});
afterAll(() => db.close());

describe('the readingSets table', () => {
  it('is version 33, keyed by id', () => {
    expect(db.verno).toBe(33);
    expect(db.readingSets.schema.primKey.name).toBe('id');
  });
});

describe('a unit key', () => {
  it('is the book code, chapter:verse and the base text', () => {
    expect(unitKey(rev3, dying, rev3.variants ?? [])).toBe('rev 3:2 ἔμελλες ἀποβάλλειν');
  });

  it('is the base in NFC', () => {
    const decomposed = 'ἔμελλες ἀποβάλλειν'.normalize('NFD');
    expect(decomposed).not.toBe(decomposed.normalize('NFC'));
    const unit = { ...dying, base: decomposed };
    expect(unitKey(rev3, unit, [unit])).toBe('rev 3:2 ' + decomposed.normalize('NFC'));
  });

  it('does not use word indexes: the same words moved in the verse keep their key', () => {
    expect(unitKey(rev3, { ...dying, w: [20, 21] }, [{ ...dying, w: [20, 21] }])).toBe(unitKey(rev3, dying, [dying]));
  });

  it('adds #2 to a second unit of the same base in the verse, and not to the first', () => {
    const a = synthetic(5, 'καὶ', [{ code: 'N', text: 'δὲ' }], [1]);
    const b = synthetic(5, 'καὶ', [{ code: 'N', text: 'τε' }], [9]);
    const other = synthetic(6, 'καὶ', [{ code: 'N', text: 'δὲ' }], [1]);
    const units = [a, other, b];
    expect(unitKeys(rev3, units)).toEqual(['rev 3:5 καὶ', 'rev 3:6 καὶ', 'rev 3:5 καὶ#2']);
    expect(unitKey(rev3, b, units)).toBe('rev 3:5 καὶ#2');
    expect(unitKey(rev3, a, units)).toBe('rev 3:5 καὶ');
  });

  it('is unique for every unit of Revelation 3', () => {
    const keys = unitKeys(rev3, rev3.variants ?? []);
    expect(keys.length).toBeGreaterThan(20);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('Byzantine', () => {
  it('is always the text\'s own reading', () => {
    for (const unit of rev3.variants ?? []) expect(readingOf(unit, BYZANTINE, 'k')).toEqual({ index: BASE, text: unit.base, code: null });
  });
});

describe('NA', () => {
  it('takes the alternative coded N on Revelation 3:2', () => {
    expect(readingOf(dying, NA, 'k')).toEqual({ index: 2, text: 'ἔμελλον ἀποθανεῖν', code: 'N' });
  });

  it('takes N on Revelation 3:7, and the base where the apparatus has only Byzantine alternatives', () => {
    expect(readingOf(opens, NA, 'k')).toMatchObject({ index: 0, text: 'ἀνοίγει', code: 'N' });
    const only = unitAt(rev3, 2, 'στήρισον');
    expect(only.alts.every((a) => a.code === 'B')).toBe(true);
    expect(readingOf(only, NA, 'k')).toEqual({ index: BASE, text: 'στήρισον', code: null });
  });

  it('prefers E (NA28), then C, then N, then S', () => {
    const unit = synthetic(1, 'x', [
      { code: 'S', text: 's' },
      { code: 'N', text: 'n' },
      { code: 'C', text: 'c' },
      { code: 'E', text: 'e' },
    ]);
    expect(readingOf(unit, NA, 'k').code).toBe('E');
    expect(readingOf({ ...unit, alts: unit.alts.slice(0, 3) }, NA, 'k').code).toBe('C');
    expect(readingOf({ ...unit, alts: unit.alts.slice(0, 2) }, NA, 'k').code).toBe('N');
    expect(readingOf({ ...unit, alts: unit.alts.slice(0, 1) }, NA, 'k').code).toBe('S');
  });

  it('keeps an omission: a reading whose text is empty is still the reading', () => {
    expect(readingOf(unitAt(rev3, 7, 'τοῦ'), NA, 'k')).toEqual({ index: 0, text: '', code: 'N' });
  });
});

describe('ECM', () => {
  const acts = Array.from({ length: 28 }, (_, i) => chapterOf('act', i + 1));
  const mUnits = acts.flatMap((c) => (c.variants ?? []).filter((u) => u.alts.some((a) => a.code === 'M')).map((unit) => ({ c, unit })));

  it('has the 18 M units of Acts, and reads the M alternative in each', () => {
    expect(mUnits).toHaveLength(18);
    for (const { unit } of mUnits) {
      const got = readingOf(unit, ECM, 'k');
      expect(got.code).toBe('M');
      expect(got.text).toBe(unit.alts[got.index].text);
    }
  });

  it('differs from NA where Acts has C beside M: Acts 11:22 NA keeps [διελθεῖν], ECM leaves it out', () => {
    const unit = unitAt(chapterOf('act', 11), 22, 'διελθεῖν');
    expect(readingOf(unit, NA, 'k')).toMatchObject({ code: 'C', text: '[διελθεῖν]' });
    expect(readingOf(unit, ECM, 'k')).toEqual({ index: 1, text: '', code: 'M' });
  });

  it('reads Acts 10:9 αὐτῶν (M only) under ECM, and the text\'s own under NA', () => {
    const unit = unitAt(chapterOf('act', 10), 9, 'ἐκείνων');
    expect(readingOf(unit, ECM, 'k')).toEqual({ index: 0, text: 'αὐτῶν', code: 'M' });
    expect(readingOf(unit, NA, 'k')).toEqual({ index: BASE, text: 'ἐκείνων', code: null });
  });

  it('reads as NA where there is no M: Revelation 3:2', () => {
    expect(readingOf(dying, ECM, 'k')).toEqual(readingOf(dying, NA, 'k'));
  });
});

describe('his own sets', () => {
  const key = unitKey(rev3, dying, rev3.variants ?? []);

  it('read their choice, else the text\'s own', () => {
    const mine = { id: 'mine', name: 'Mine', choices: { [key]: 1 } };
    expect(readingOf(dying, mine, key)).toEqual({ index: 1, text: 'ἐμέλλον ἀποθάνειν', code: 'B' });
    expect(readingOf(opens, mine, 'rev 3:7 ἀνοίξει')).toEqual({ index: BASE, text: 'ἀνοίξει', code: null });
  });

  it('read BASE as the text\'s own reading', () => {
    expect(readingOf(dying, { id: 'x', name: 'X', choices: { [key]: BASE } }, key)).toMatchObject({ index: BASE });
  });

  it('ignore a choice the unit no longer has', () => {
    expect(readingOf(dying, { id: 'x', name: 'X', choices: { [key]: 9 } }, key)).toMatchObject({ index: BASE });
  });

  it('started from NA read NA where they have no choice of their own, and the choice where they have', () => {
    const seeded = { id: 'mine', name: 'Mine', choices: { [key]: 0 }, from: 'na' as const };
    expect(readingOf(dying, seeded, key)).toMatchObject({ index: 0, code: 'B' });
    expect(readingOf(opens, seeded, 'rev 3:7 ἀνοίξει')).toMatchObject({ index: 0, code: 'N' });
    expect(readingOf(opens, { ...seeded, choices: { 'rev 3:7 ἀνοίξει': BASE } }, 'rev 3:7 ἀνοίξει')).toMatchObject({ index: BASE });
  });
});

describe('units that share a word', () => {
  it('are the other units of the verse with a word in common', () => {
    const a = synthetic(4, 'a b', [{ code: 'N', text: 'c' }], [1, 2]);
    const b = synthetic(4, 'b', [{ code: 'M', text: 'd' }], [2]);
    const c = synthetic(4, 'e', [{ code: 'M', text: 'f' }], [7]);
    const d = synthetic(5, 'b', [{ code: 'M', text: 'g' }], [2]);
    const units = [a, b, c, d];
    expect(sharingKeys(rev3, a, units)).toEqual(['rev 3:4 b']);
    expect(sharingKeys(rev3, b, units)).toEqual(['rev 3:4 a b']);
    expect(sharingKeys(rev3, c, units)).toEqual([]);
  });
});

describe('the active set', () => {
  it('is Byzantine until he chooses', async () => {
    expect(await getActiveSet()).toEqual(BYZANTINE);
    expect(await db.settings.get('readingSet')).toBeUndefined();
  });

  it('lists the three built-ins first, then his sets by name', async () => {
    await db.readingSets.bulkPut([
      { id: 'b', name: 'Beta', choices: {} },
      { id: 'a', name: 'Alpha', choices: {} },
    ]);
    expect((await listReadingSets()).map((s) => s.id)).toEqual(['byzantine', 'na', 'ecm', 'a', 'b']);
  });

  it('switches to a built-in and to a set of his, and refuses one that is not there', async () => {
    await db.readingSets.put({ id: 'a', name: 'Alpha', choices: {} });
    expect(await setActive('na')).toBe(true);
    expect((await getActiveSet()).id).toBe('na');
    expect(await db.settings.get('readingSet')).toEqual({ key: 'readingSet', value: 'na' });
    expect(await setActive('a')).toBe(true);
    expect((await getActiveSet()).name).toBe('Alpha');
    expect(await setActive('nope')).toBe(false);
    expect((await getActiveSet()).id).toBe('a');
  });

  it('is Byzantine again when the saved set is gone', async () => {
    await db.settings.put({ key: 'readingSet', value: 'gone' });
    expect(await getActiveSet()).toEqual(BYZANTINE);
  });
});

describe('choosing a reading', () => {
  const key = unitKey(rev3, dying, rev3.variants ?? []);

  it('under a built-in set seeds Mine from Byzantine, writes there and makes Mine active', async () => {
    await chooseReading(key, 1);
    const active = await getActiveSet();
    expect(active).toEqual({ id: 'mine', name: 'Mine', choices: { [key]: 1 } });
    expect(await db.settings.get('readingSet')).toEqual({ key: 'readingSet', value: 'mine' });
    expect(await db.readingSets.count()).toBe(1);
  });

  it('under NA seeds Mine from NA: the places he did not touch still read NA', async () => {
    await setActive('na');
    await chooseReading(key, 0);
    const mine = await getActiveSet();
    expect(mine.id).toBe('mine');
    expect(readingOf(dying, mine, key)).toMatchObject({ index: 0, code: 'B' });
    expect(readingOf(opens, mine, 'rev 3:7 ἀνοίξει')).toMatchObject({ code: 'N' });
  });

  it('under ECM seeds Mine from ECM', async () => {
    await setActive('ecm');
    await chooseReading(key, BASE);
    const mine = await getActiveSet();
    expect(mine.from).toBe('ecm');
    expect(readingOf(dying, mine, key)).toMatchObject({ index: BASE });
  });

  it('never changes a built-in', async () => {
    await setActive('na');
    await chooseReading(key, 0);
    expect(readingOf(dying, NA, key)).toMatchObject({ index: 2 });
    expect((await listReadingSets()).filter((s) => s.id === 'na')).toEqual([NA]);
    expect(await db.readingSets.get('na')).toBeUndefined();
  });

  it('writes into Mine when Mine is the set in force, and puts the text\'s own back by BASE', async () => {
    await chooseReading(key, 1);
    await chooseReading('rev 3:7 ἀνοίξει', 0);
    expect((await getActiveSet()).choices).toEqual({ [key]: 1, 'rev 3:7 ἀνοίξει': 0 });
    await chooseReading(key, BASE);
    expect((await getActiveSet()).choices).toEqual({ 'rev 3:7 ἀνοίξει': 0 });
    expect(await db.readingSets.count()).toBe(1);
  });

  it('writes into a named set of his when it is in force', async () => {
    await db.readingSets.put({ id: 'a', name: 'Alpha', choices: {} });
    await setActive('a');
    await chooseReading(key, 2);
    expect((await db.readingSets.get('a'))?.choices).toEqual({ [key]: 2 });
    expect(await db.readingSets.get('mine')).toBeUndefined();
    expect((await getActiveSet()).id).toBe('a');
  });

  it('clears a choice on a unit that shares a word with the one chosen', async () => {
    await chooseReading('rev 3:4 b', 0);
    await chooseReading('rev 3:4 a b', 0, ['rev 3:4 b']);
    expect((await getActiveSet()).choices).toEqual({ 'rev 3:4 a b': 0 });
  });

  it('puts BASE for a shared unit when the set was started from NA, so NA does not come back', async () => {
    await setActive('na');
    await chooseReading('rev 3:4 a b', 0, ['rev 3:4 b']);
    expect((await getActiveSet()).choices).toEqual({ 'rev 3:4 a b': 0, 'rev 3:4 b': BASE });
  });
});

describe('saving, renaming and deleting', () => {
  const key = 'rev 3:2 ἔμελλες ἀποβάλλειν';

  it('saves a copy of the set in force under a name, and makes it the one in force', async () => {
    await chooseReading(key, 1);
    const saved = await saveSetAs('  My Rev ', 5);
    expect(saved).toMatchObject({ name: 'My Rev', choices: { [key]: 1 } });
    expect(saved?.id).not.toBe('mine');
    expect((await getActiveSet()).id).toBe(saved?.id);
    expect((await db.readingSets.get('mine'))?.choices).toEqual({ [key]: 1 });
    await chooseReading(key, BASE);
    expect((await db.readingSets.get('mine'))?.choices).toEqual({ [key]: 1 });
    expect((await db.readingSets.get(saved?.id ?? ''))?.choices).toEqual({});
  });

  it('saves a built-in as a set that reads it', async () => {
    await setActive('na');
    const saved = await saveSetAs('NA copy');
    expect(saved?.from).toBe('na');
    expect(readingOf(dying, saved ?? BYZANTINE, key)).toMatchObject({ code: 'N' });
    expect(await db.readingSets.get('mine')).toBeUndefined();
  });

  it('refuses a blank name', async () => {
    expect(await saveSetAs('   ')).toBeUndefined();
    expect(await db.readingSets.count()).toBe(0);
  });

  it('gives two sets saved in the same moment two ids', async () => {
    const a = await saveSetAs('A', 7);
    const b = await saveSetAs('B', 7);
    expect(a?.id).not.toBe(b?.id);
    expect(await db.readingSets.count()).toBe(2);
  });

  it('renames a set of his, and refuses a built-in, a blank name and a set that is not there', async () => {
    const saved = await saveSetAs('Old');
    expect(await renameSet(saved?.id ?? '', ' New ')).toMatchObject({ name: 'New' });
    expect((await db.readingSets.get(saved?.id ?? ''))?.name).toBe('New');
    expect(await renameSet(saved?.id ?? '', '  ')).toBeUndefined();
    expect(await renameSet('na', 'Mine too')).toBeUndefined();
    expect(await renameSet('nope', 'x')).toBeUndefined();
    expect((await getActiveSet()).name).toBe('New');
  });

  it('deletes a set of his, and Byzantine is in force again when it was the one', async () => {
    const saved = await saveSetAs('Gone');
    expect(await deleteSet(saved?.id ?? '')).toBe(true);
    expect(await db.readingSets.count()).toBe(0);
    expect((await getActiveSet()).id).toBe('byzantine');
  });

  it('keeps the set in force when another is deleted', async () => {
    const other = await saveSetAs('Other');
    const keep = await saveSetAs('Keep');
    expect(await deleteSet(other?.id ?? '')).toBe(true);
    expect((await getActiveSet()).id).toBe(keep?.id);
  });

  it('never deletes a built-in', async () => {
    for (const id of ['byzantine', 'na', 'ecm']) expect(await deleteSet(id)).toBe(false);
    await setActive('na');
    expect(await deleteSet('na')).toBe(false);
    expect((await getActiveSet()).id).toBe('na');
    expect(await deleteSet('nope')).toBe(false);
  });
});
