// One frontier idea at a time (mw-i7xe0n.6): every path that writes a grammar level leaves at most one idea at the frontier (the letters, pairs and
// breathings, which are items of a group, are not ideas he is "learning" and are left out of the count).
import Dexie from 'dexie';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearBus } from '../../src/events/bus';
import { db, type GrammarLevel, type GrammarLevelHow, type GrammarLevelName } from '../../src/data/db';
import { learningNow } from '../../src/data/grammar/goalProgress';
import { LETTER_IDS } from '../../src/data/grammar/inference';
import { LADDER, ITEM_GROUPS, groupOfItem } from '../../src/data/grammar/ladder';
import { isItemId } from '../../src/data/grammar/soundScope';
import { DAY } from '../../src/data/schedule';
import { noteAnswer } from '../../src/data/repositories/inference';
import {
  getLevel,
  listLevels,
  otherFrontier,
  recordDrill,
  recordGrammarAnswer,
  setLevel,
  teachIdea,
} from '../../src/data/repositories/grammarLevels';
import { unmetNeed, type DrillResult } from '../../src/data/grammar/drillIt';

const NOW = Date.UTC(2026, 9, 12, 9, 0, 0);

beforeEach(async () => {
  await db.open();
  await Promise.all([db.grammarLevels.clear(), db.reviews.clear(), db.settings.clear(), db.drillRuns.clear()]);
});
afterEach(clearBus);
afterAll(() => db.close());

/** The ideas at the frontier now, by plain id, items left out. */
const frontier = async (): Promise<string[]> =>
  [...(await listLevels())].filter(([id, row]) => row.level === 'frontier' && !id.startsWith('letter-')).map(([id]) => id).sort();

const put = (id: string, level: GrammarLevelName, since = NOW, how: GrammarLevelHow = 'sheet'): Promise<unknown> =>
  db.grammarLevels.put({ id: id.startsWith('letter-') || ['alphabet', 'accents', 'iota-subscript', 'diphthongs'].includes(id) ? `modern:${id}` : id, level, since, how });

describe('the items of a group', () => {
  it('are told by their ids exactly as the ladder tells them by their group', () => {
    for (const idea of LADDER) expect(isItemId(idea.id), idea.id).toBe(groupOfItem(idea) !== undefined);
  });

  it('are never the idea he is learning now', () => {
    expect(learningNow(new Map([['letter-xi', 'frontier'], ['pair-mp', 'frontier']]))).toBeUndefined();
    expect(learningNow(new Map([['letter-xi', 'frontier'], ['noun', 'frontier']]))?.id).toBe('noun');
  });
});

describe('making a second idea the frontier', () => {
  beforeEach(async () => {
    await teachIdea('case-genitive', 'got-it', NOW);
    await db.reviews.where('[kind+id]').equals(['grammar', 'case-genitive']).modify({ rights: 4, lapses: 1, step: 2 });
  });

  it('asks the caller to choose, and changes nothing until it does', async () => {
    const before = await db.reviews.toArray();
    expect(await otherFrontier('case-dative')).toBe('case-genitive');
    expect(await teachIdea('case-dative', 'got-it', NOW + DAY)).toEqual({ status: 'busy', other: 'case-genitive' });
    expect(await frontier()).toEqual(['case-genitive']);
    expect(await getLevel('case-dative')).toBeUndefined();
    expect(await db.reviews.toArray()).toEqual(before);
  });

  it('with keep, leaves everything as it was', async () => {
    const [levels, reviews] = [await db.grammarLevels.toArray(), await db.reviews.toArray()];
    expect(await teachIdea('case-dative', 'got-it', NOW + DAY, 'sheet', 'keep')).toEqual({ status: 'kept', other: 'case-genitive' });
    expect(await db.grammarLevels.toArray()).toEqual(levels);
    expect(await db.reviews.toArray()).toEqual(reviews);
  });

  it('with switch, leaves exactly one frontier: the new idea; the old one is not yet, its reviews row unchanged', async () => {
    const kept = await db.reviews.get(['grammar', 'case-genitive']);
    expect(await teachIdea('case-dative', 'got-it', NOW + DAY, 'sheet', 'switch')).toEqual({ status: 'taught' });
    expect(await frontier()).toEqual(['case-dative']);
    expect(await getLevel('case-genitive')).toMatchObject({ level: 'notYet' });
    expect(await db.reviews.get(['grammar', 'case-genitive'])).toEqual(kept);
    expect(await db.reviews.get(['grammar', 'case-dative'])).toBeDefined();
  });

  it('teaching the idea that already is the frontier is no second one', async () => {
    expect(await teachIdea('case-genitive', 'got-it', NOW + DAY)).toEqual({ status: 'taught' });
    expect(await frontier()).toEqual(['case-genitive']);
  });

  it('a proof by drill on the second idea does not make it a frontier either', async () => {
    const failed = { ideaId: 'case-dative', proved: false, edgeStep: 0, topStep: 3, strong: [], weak: [], answers: [], ended: 'edge' } as DrillResult;
    expect(await recordDrill(failed, 'prove', NOW + DAY)).toBe('notYet');
    expect(await frontier()).toEqual(['case-genitive']);
  });

  it('a review answer neither promotes a not-yet idea nor drops a solid one to a second frontier', async () => {
    await recordGrammarAnswer('case-dative', true, NOW + DAY);
    expect(await frontier()).toEqual(['case-genitive']);
    expect(await db.reviews.get(['grammar', 'case-dative'])).toMatchObject({ step: 0 });
    await put('case-accusative', 'solid');
    await recordGrammarAnswer('case-accusative', false, NOW + DAY);
    expect(await getLevel('case-accusative')).toMatchObject({ level: 'solid' });
    expect(await frontier()).toEqual(['case-genitive']);
  });

  it('proving an idea that was not the frontier changes no frontier', async () => {
    await teachIdea('case-dative', 'known', NOW + DAY);
    expect(await frontier()).toEqual(['case-genitive']);
  });

  it('a letter is an item, not an idea he is learning: it can be frontier beside the idea', async () => {
    await recordGrammarAnswer('letter-xi', true, NOW + DAY);
    expect(await getLevel('letter-xi')).toMatchObject({ level: 'frontier' });
    expect(await frontier()).toEqual(['case-genitive']);
  });
});

describe('proving the frontier', () => {
  beforeEach(async () => {
    for (const id of LETTER_IDS) await put(id, 'solid');
    await put('alphabet', 'frontier');
  });

  it('makes the lowest not-yet idea whose prerequisites are all solid the new frontier', async () => {
    await teachIdea('alphabet', 'known', NOW);
    expect(await getLevel('alphabet')).toMatchObject({ level: 'solid' });
    // 'diphthongs' rests on six letters, all solid; nothing lower on the ladder is a not-yet idea, and 'consonant-pairs' is higher
    expect(await frontier()).toEqual(['diphthongs']);
    expect(await db.reviews.get(['grammar', 'modern:diphthongs'])).toMatchObject({ step: 0, due: NOW + DAY });
  });

  it('counts the letters solid once the alphabet is, whatever a letter\'s own row says (mw-i7xe0n.19)', async () => {
    await put('letter-omicron', 'notYet');
    await teachIdea('alphabet', 'known', NOW);
    expect(await frontier()).toEqual(['diphthongs']);
  });

  it('works when the review of the frontier takes it to solid', async () => {
    await put('case-genitive', 'frontier');
    await put('alphabet', 'solid');
    await db.reviews.put({ kind: 'grammar', id: 'case-genitive', step: 2, due: NOW, lastWhen: NOW, lapses: 0, rights: 3 });
    await recordGrammarAnswer('case-genitive', true, NOW);
    expect(await getLevel('case-genitive')).toMatchObject({ level: 'solid' });
    expect(await frontier()).toEqual(['diphthongs']);
  });
});

describe('the placement', () => {
  it('leaves exactly one frontier: the lowest unproved idea, the rest above it not yet, solid ones solid', async () => {
    await setLevel('case-genitive', 'frontier', 'placement', NOW);
    await setLevel('case-dative', 'frontier', 'placement', NOW);
    await setLevel('case-accusative', 'solid', 'placement', NOW);
    await setLevel('noun', 'frontier', 'placement', NOW);
    await setLevel('number-singular', 'notYet', 'placement', NOW);
    expect(await frontier()).toEqual(['noun']);
    for (const id of ['case-genitive', 'case-dative', 'number-singular']) expect(await getLevel(id)).toMatchObject({ level: 'notYet', how: 'placement' });
    expect(await getLevel('case-accusative')).toMatchObject({ level: 'solid' });
  });

  it('makes a not-yet idea the frontier when it is the lowest unproved', async () => {
    await setLevel('case-genitive', 'frontier', 'placement', NOW);
    await setLevel('noun', 'notYet', 'placement', NOW);
    expect(await frontier()).toEqual(['noun']);
    expect(await getLevel('case-genitive')).toMatchObject({ level: 'notYet' });
  });

  it('keeps its schedule rows when it puts an idea back', async () => {
    await recordGrammarAnswer('case-genitive', true, NOW);
    const row = await db.reviews.get(['grammar', 'case-genitive']);
    await setLevel('noun', 'frontier', 'placement', NOW);
    expect(await frontier()).toEqual(['noun']);
    expect(await db.reviews.get(['grammar', 'case-genitive'])).toEqual(row);
  });
});

describe('inference', () => {
  it('a miss on a sound or mark he held by inference leaves one frontier, the lowest', async () => {
    await put('accents', 'solid', NOW, 'inferred');
    await put('iota-subscript', 'solid', NOW, 'inferred');
    await noteAnswer({ kind: 'sound', ideaId: 'iota-subscript', form: undefined, right: 'x' }, false, NOW);
    await noteAnswer({ kind: 'sound', ideaId: 'accents', form: undefined, right: 'x' }, false, NOW);
    expect(await frontier()).toEqual(['accents']);
    expect(await getLevel('iota-subscript')).toMatchObject({ level: 'notYet' });
  });

  it('puts the frontier he was learning back to not yet when a lower idea falls back', async () => {
    await put('accents', 'solid', NOW, 'inferred');
    await put('case-genitive', 'frontier');
    await noteAnswer({ kind: 'sound', ideaId: 'accents', form: undefined, right: 'x' }, false, NOW);
    expect(await frontier()).toEqual(['accents']);
    expect(await getLevel('case-genitive')).toMatchObject({ level: 'notYet' });
  });

  it('does not make a higher idea a second frontier when a lower one is being learned', async () => {
    await put('accents', 'frontier');
    await put('iota-subscript', 'solid', NOW, 'inferred');
    await noteAnswer({ kind: 'sound', ideaId: 'iota-subscript', form: undefined, right: 'x' }, false, NOW);
    expect(await frontier()).toEqual(['accents']);
  });
});

describe('the upgrade from version 20', () => {
  it('leaves the one idea changed most recently at the frontier and every reviews row intact', async () => {
    db.close();
    await Dexie.delete('lampas');
    const old = new Dexie('lampas');
    old.version(20).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
      readings: 'ref',
      grammarKnown: 'term',
      reviews: '[kind+id], due, kind',
      grammarLevels: 'id, level',
      usage: 'key, day, name',
      tips: 'id, status',
      talkPictures: '++id, turnId',
      shares: 'id, createdAt',
      requests: 'txid, sentAt, status',
      readingHistory: '++id, ref, [lang+at]',
      missTally: '[lang+unit], lang',
      ladder: 'lang',
      drillRuns: '++id, ideaId, at',
    });
    await old.open();
    const rows: GrammarLevel[] = [
      { id: 'case-genitive', level: 'frontier', since: 100, how: 'review' },
      { id: 'case-dative', level: 'frontier', since: 300, how: 'sheet' },
      { id: 'modern:accents', level: 'frontier', since: 200, how: 'inferred' },
      { id: 'modern:letter-xi', level: 'frontier', since: 50, how: 'review' },
      { id: 'noun', level: 'solid', since: 400, how: 'sheet' },
    ];
    const reviews = rows.map((r, i) => ({ kind: 'grammar', id: r.id, step: i, due: 9, lastWhen: 4, lapses: i, rights: 2 }));
    await old.table('grammarLevels').bulkPut(rows);
    await old.table('reviews').bulkPut(reviews);
    old.close();

    await db.open();
    expect(db.verno).toBe(30);
    const after = new Map((await db.grammarLevels.toArray()).map((r) => [r.id, r]));
    expect([...after.values()].filter((r) => r.level === 'frontier' && !r.id.includes('letter-')).map((r) => r.id)).toEqual(['case-dative']);
    expect(after.get('case-genitive')).toMatchObject({ level: 'notYet', since: 100, how: 'review' });
    expect(after.get('modern:accents')).toMatchObject({ level: 'notYet' });
    expect(after.get('modern:letter-xi')).toMatchObject({ level: 'frontier' });
    expect(after.get('noun')).toMatchObject({ level: 'solid' });
    expect((await db.reviews.toArray()).sort((a, b) => a.id.localeCompare(b.id))).toEqual([...reviews].sort((a, b) => a.id.localeCompare(b.id)));
  });
});

describe('marking a group idea known while it is Learning (mw-i7xe0n.19)', () => {
  it.each(ITEM_GROUPS)('%s: leaves exactly one idea Learning, and no idea waits on one of its items', async (group) => {
    await teachIdea(group, 'got-it', NOW);
    await teachIdea(group, 'known', NOW);
    const learning = await frontier();
    expect(learning).toHaveLength(1);
    expect(learning).not.toContain(group);
    const levels = new Map([...(await listLevels())].map(([id, row]) => [id, row.level]));
    const items = new Set(LADDER.filter((idea) => groupOfItem(idea) === group).map((idea) => idea.id));
    const waiting = LADDER.map((idea) => unmetNeed(idea.id, levels)).filter((id) => id !== null && items.has(id));
    expect(waiting).toEqual([]);
  });
});
