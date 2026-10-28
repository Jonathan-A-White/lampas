// The variants the tutor is told (mw-9ji6ek0.7, src/tutor/variantFacts.ts): with Variants on, the verse in hand carries the units set in it, each with its readings in Greek and
// English and the witness spelled out, and the chapter's count; with it Off nothing. The same data rides in the Bible talk's request (`variants`), is the fact `variants` the tutor may
// ask for, and is what the brace sheet's Ask the tutor opens its talk on.
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { setSetting } from '../../src/settings/store';
import { variantsSetting, variantWitnessesSetting } from '../../src/settings/definitions';
import { buildTalkRequest } from '../../src/services/talk';
import { dropVariants } from '../../src/services/talkFit';
import { lampasRegistry } from '../../src/tutor/registry';
import { VARIANT_QUESTION, variantFactsOf } from '../../src/tutor/variantFacts';
import { stubChapterFetch } from '../support/chapter-fetch';

const rev3 = JSON.parse(readFileSync('public/data/rev/3.json', 'utf8')) as Chapter;
const verse2 = rev3.verses.find((v) => v.n === 2)!;
const ON = { variants: 'all', witnesses: 'ecm' } as const;

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await db.settings.clear();
  window.location.hash = '';
});

describe('variantFactsOf', () => {
  it('Revelation 3:2 carries its two units, each reading in Greek and English with its witness, and the chapter count', () => {
    const facts = variantFactsOf(rev3, [2], ON);
    expect(facts?.chapter_units).toBe(rev3.variants!.length);
    expect(facts?.units).toHaveLength(2);
    expect(facts?.units[0]).toEqual({
      verse: 2,
      text: { greek: 'στήρισον', english: 'establish' },
      other_readings: [
        { greek: 'στήριξον', english: 'establish', witness: ['B: the Byzantine text is split here'] },
        { greek: 'τήρησον', english: 'keep', witness: ['B: the Byzantine text is split here'] },
      ],
    });
    const second = facts!.units[1];
    expect(second.text).toEqual({ greek: 'ἔμελλες ἀποβάλλειν', english: 'you were about to throw away' });
    expect(second.other_readings.map((r) => r.greek)).toEqual(['ἠμελλες ἀποβάλλειν', 'ἐμέλλον ἀποθάνειν', 'ἔμελλον ἀποθανεῖν']);
    expect(second.other_readings[2]).toMatchObject({ english: 'I was about to die', witness: ['NA27/NA28: Nestle-Aland reads this'] });
  });

  it('says nothing with Variants Off', () => {
    expect(variantFactsOf(rev3, [2], { variants: 'off', witnesses: 'ecm' })).toBeUndefined();
  });

  it('follows the filters: Witnesses cut the readings, and a unit with none left is left out', () => {
    const facts = variantFactsOf(rev3, [2], { variants: 'all', witnesses: 'byz' });
    expect(facts?.units[1].other_readings.map((r) => r.greek)).toEqual(['ἠμελλες ἀποβάλλειν', 'ἐμέλλον ἀποθάνειν']);
    expect(facts!.chapter_units).toBeLessThanOrEqual(rev3.variants!.length);
  });

  it('carries the units of every verse the talk holds, and none of a verse with none', () => {
    expect(variantFactsOf(rev3, [1, 2, 3], ON)?.units.map((u) => u.verse)).toEqual(expect.arrayContaining([1, 2, 3]));
    const free = rev3.verses.find((v) => !rev3.variants!.some((u) => u.v === v.n))!;
    expect(variantFactsOf(rev3, [free.n], ON)?.units).toEqual([]);
  });

  it('says nothing for a chapter with no variants', () => {
    expect(variantFactsOf({ variants: [] }, [1], ON)).toBeUndefined();
    expect(variantFactsOf({}, [1], ON)).toBeUndefined();
  });
});

describe('the Bible talk request', () => {
  const scope = { title: 'Revelation 3:2', chapter: rev3, verse: verse2 };

  it('carries `variants` for the verse in hand when Variants is on', () => {
    const request = buildTalkRequest(scope, 'What is the difference?', [], [], { variants: 'english', variantWitnesses: 'ecm' });
    expect(request.variants?.units.map((u) => u.verse)).toEqual([2, 2]);
    expect(request.variants?.units[0].other_readings[0].witness[0]).toMatch(/Byzantine/);
  });

  it('has no `variants` when Variants is Off, or when the talk is about a screen', () => {
    expect('variants' in buildTalkRequest(scope, 'What is the difference?', [], [], { variants: 'off', variantWitnesses: 'ecm' })).toBe(false);
    expect('variants' in buildTalkRequest(scope, 'What is the difference?', [], [])).toBe(false);
    const screen = { title: 'Words', chapter: rev3, verse: null, screen: { name: 'Words', facts: [] } };
    expect('variants' in buildTalkRequest(screen, 'Hi', [], [], { variants: 'all', variantWitnesses: 'ecm' })).toBe(false);
  });

  it('dropVariants takes the field out, and nothing when it has none', () => {
    const request = buildTalkRequest(scope, 'Why?', [], [], { variants: 'all', variantWitnesses: 'ecm' });
    expect('variants' in (dropVariants(request) ?? { variants: 1 })).toBe(false);
    expect(dropVariants({ ...request, variants: undefined })).toBeNull();
  });
});

describe('the fact `variants`', () => {
  it('is not a core fact, and is read for the verse in hand when Variants is on', async () => {
    stubChapterFetch();
    const registry = lampasRegistry();
    expect(registry.facts.find((f) => f.name === 'variants')?.core).toBeFalsy();
    await setSetting(variantsSetting, 'all');
    await setSetting(variantWitnessesSetting, 'ecm');
    window.location.hash = '#/?b=rev&c=3&v=2';
    const read = await registry.read('variants');
    expect(read.ok).toBe(true);
    expect((read as { value: { units: { verse: number }[]; chapter_units: number } }).value.units.map((u) => u.verse)).toEqual([2, 2]);
  });

  it('is not there to read with Variants Off: the read is refused', async () => {
    stubChapterFetch();
    window.location.hash = '#/?b=rev&c=3&v=2';
    const read = await lampasRegistry().read('variants');
    expect(read.ok).toBe(false);
  });
});

describe('the question the brace sheet\'s Ask the tutor leaves ready', () => {
  it('is the Governor\'s own', () => {
    expect(VARIANT_QUESTION).toBe('What is the difference, and does it change the sense?');
  });
});
