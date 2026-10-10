// The quick round of the placement (src/data/grammar/quickRound.ts, mw-hqd5bz.18) and the items it asks: one for each letter and each combination.
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { approachOf } from '../../src/approaches';
import { db } from '../../src/data/db';
import { gapsOf, groupIsSolid, lettersText } from '../../src/data/grammar/inference';
import { LADDER, ITEM_GROUPS, ideaOf, itemName, itemsOf } from '../../src/data/grammar/ladder';
import { learnNext } from '../../src/data/grammar/goalProgress';
import type { Level } from '../../src/data/grammar/needs';
import { QUICK_LIMIT, answerQuick, currentQuick, quickItems, quickOver, quickQuestion, quickSeed, startQuick, stopQuick } from '../../src/data/grammar/quickRound';
import { buildIdeaQuestion } from '../../src/data/grammar/questions';
import { foundationOf } from '../../src/data/grammar/inference';
import { mulberry32 } from '../../src/data/quiz';
import { clearBus } from '../../src/events/bus';
import { getLevel, setLevel } from '../../src/data/repositories/grammarLevels';
import { noteWordRead } from '../../src/data/repositories/inference';
import { writeQuick, type QuickWriter } from '../../src/data/grammar/placementWrite';

const solid = (...ids: string[]) => new Map<string, Level>(ids.map((id) => [id, 'solid']));
const allSolid = (except: string[] = []): Map<string, Level> =>
  solid(...ITEM_GROUPS.flatMap((g) => itemsOf(g).map((i) => i.id)).filter((id) => !except.includes(id)));

describe('the items of the ladder', () => {
  it('has one item for each diphthong, consonant pair and breathing, resting on its group', () => {
    expect(itemsOf('diphthongs').map((i) => i.pair)).toEqual(['αι', 'ει', 'οι', 'υι', 'ου', 'αυ', 'ευ', 'ηυ']);
    expect(itemsOf('consonant-pairs').map((i) => i.pair)).toEqual(['μπ', 'ντ', 'γκ', 'γγ', 'γχ', 'γξ']);
    expect(itemsOf('breathings').map((i) => i.id)).toEqual(['breathing-rough', 'breathing-smooth']);
    expect(itemsOf('alphabet')).toHaveLength(24);
    for (const group of ['diphthongs', 'consonant-pairs', 'breathings']) {
      for (const item of itemsOf(group)) {
        expect(item.parent).toBe(group);
        expect(item.needs).toEqual([group]);
        expect(item.rung).toBeGreaterThan(ideaOf(group).rung);
        expect(item.sound?.trim(), item.id).toBeTruthy();
        expect(item.glyphs).toBeUndefined();
      }
    }
    expect(LADDER.filter((i) => i.parent)).toHaveLength(16);
  });

  it('has a parent that is solid when every child is, and not otherwise', () => {
    for (const group of ITEM_GROUPS) {
      expect(groupIsSolid(allSolid(), group), group).toBe(true);
      const [first] = itemsOf(group);
      expect(groupIsSolid(allSolid([first.id]), group), group).toBe(false);
    }
  });

  it('is credited by a form that uses it', () => {
    expect(foundationOf('οὐρανός')).toEqual(expect.arrayContaining(['diphthongs', 'diphthong-ou', 'breathings', 'breathing-smooth']));
    expect(foundationOf('ἄγγελος')).toEqual(expect.arrayContaining(['consonant-pairs', 'pair-gg']));
    expect(foundationOf('ὁ')).toContain('breathing-rough');
  });
});

describe('the round', () => {
  it('asks only the letters and combinations that are not solid, in the ladder order', () => {
    const items = quickItems(allSolid(['letter-xi', 'letter-psi', 'diphthong-ou']), 3);
    expect(items.map((i) => i.id)).toEqual(['letter-xi', 'letter-psi', 'diphthong-ou']);
  });

  it('asks nothing when everything is solid, and is no round', () => {
    expect(quickItems(allSolid(), 1)).toEqual([]);
    expect(startQuick(allSolid(), 1)).toBeNull();
  });

  it('asks all 40 for a reader who knows nothing, and never more than the limit', () => {
    expect(QUICK_LIMIT).toBe(40);
    expect(quickItems(new Map(), 1)).toHaveLength(40);
  });

  it('passes over a group he said he knows whole', () => {
    const ids = quickItems(new Map(), 1, new Set(['alphabet'])).map((i) => i.id);
    expect(ids.some((id) => id.startsWith('letter-'))).toBe(false);
    expect(ids).toHaveLength(16);
  });

  it('hears and sees in turn, and only sees a breathing', () => {
    const items = quickItems(new Map(), 0);
    expect(new Set(items.map((i) => i.mode))).toEqual(new Set(['hear', 'see']));
    for (const item of items.filter((i) => i.id.startsWith('breathing-'))) expect(item.mode).toBe('see');
    expect(items[0].mode).not.toBe(items[1].mode);
  });

  it('writes down each answer, and Stop here keeps what was answered', () => {
    let round = startQuick(new Map(), 1)!;
    expect(currentQuick(round)!.id).toBe('letter-alpha');
    round = answerQuick(answerQuick(round, true), false);
    expect(round.answers).toEqual([{ id: 'letter-alpha', right: true }, { id: 'letter-beta', right: false }]);
    expect(quickOver(round)).toBe(false);
    const stopped = stopQuick(round);
    expect(quickOver(stopped)).toBe(true);
    expect(stopped.answers).toHaveLength(2);
    expect(answerQuick(stopped, true)).toBe(stopped);
  });
});

describe('the questions', () => {
  const round = startQuick(new Map(), 0)!;
  const questionsFor = (mode: 'hear' | 'see') =>
    round.items.filter((i) => i.mode === mode).map((item) => ({ item, q: quickQuestion(item, mulberry32(quickSeed({ ...round, at: round.items.indexOf(item) }))) }));

  it('Hear and pick says the letter or pair and offers four that sound different', () => {
    for (const { item, q } of questionsFor('hear')) {
      const idea = ideaOf(item.id);
      const glyph = idea.glyphs?.[0] ?? idea.pair;
      expect(q.kind).toBe('sound');
      expect(q.say, item.id).toBe(glyph);
      expect(q.right).toBe(glyph);
      expect(q.options, item.id).toHaveLength(4);
      expect(q.options.filter((o) => o === q.right)).toHaveLength(1);
      expect(new Set(q.options).size).toBe(4);
    }
  });

  it('See and pick shows the letter or pair and offers four sounds, one right, and says nothing', () => {
    for (const { item, q } of questionsFor('see')) {
      if (item.id.startsWith('breathing-')) continue;
      const idea = ideaOf(item.id);
      expect(q.kind).toBe('letter');
      expect(q.form).toBe(idea.glyphs?.[0] ?? idea.pair);
      expect(q.say).toBeUndefined();
      expect(q.options, item.id).toHaveLength(4);
      expect(q.options).toContain(q.right);
      expect(new Set(q.options).size).toBe(4);
    }
  });

  it('shows a word for a breathing and asks which', () => {
    const rough = quickQuestion({ id: 'breathing-rough', mode: 'see' }, mulberry32(1));
    expect(rough).toMatchObject({ kind: 'breathing', ideaId: 'breathing-rough', right: 'Rough', options: ['Rough', 'Smooth'] });
    expect(quickQuestion({ id: 'breathing-smooth', mode: 'see' }, mulberry32(1)).right).toBe('Smooth');
  });

  it('is the same question for the same round, and a Review question for an item too', () => {
    const item = round.items[2];
    expect(quickQuestion(item, mulberry32(9))).toEqual(quickQuestion(item, mulberry32(9)));
    const review = buildIdeaQuestion(ideaOf('diphthong-ou'), [], mulberry32(4));
    expect(review.ideaId).toBe('diphthong-ou');
    expect(review.options).toContain(review.right);
  });
});

describe('the gaps', () => {
  const bma = approachOf('bma-tutor')!;
  const needs = { ideas: ['alphabet', 'breathings', 'accents', 'noun'].map((id) => ({ id, count: 1, example: { form: '', code: '', ref: '' } })) };
  const missed = ['letter-xi', 'letter-psi', 'diphthong-ou'];

  it('names the exact items not solid in each group that is partly known', () => {
    expect(gapsOf(allSolid(missed)).map((i) => i.id)).toEqual(missed);
    expect(lettersText(gapsOf(allSolid(missed)))).toBe('ξ, ψ and ου');
    // a group with nothing solid has no exact gap: it is the whole idea
    expect(gapsOf(new Map())).toEqual([]);
    expect(itemName(ideaOf('breathing-rough'))).toBe('rough breathing');
  });

  it("is what Learn next names, even a group the goal does not need", () => {
    const next = learnNext(needs, bma, allSolid(missed))!;
    expect(next.gaps?.map((i) => i.id)).toEqual(missed);
    expect(next.idea.id).toBe('letter-xi');
    // only the diphthong is missing: the diphthongs are in no goal's needs, and are still named
    const only = learnNext(needs, bma, allSolid(['diphthong-ou']))!;
    expect(only.gaps?.map((i) => i.id)).toEqual(['diphthong-ou']);
    expect(learnNext(needs, bma, allSolid())!.idea.id).toBe('accents');
  });
});

describe('what a tap writes', () => {
  const calls: string[] = [];
  const writer: QuickWriter = {
    answer: async (id, right) => void calls.push(`answer ${id} ${right}`),
    level: async (id, level) => void calls.push(`level ${id} ${level}`),
    miss: async (q) => void calls.push(`miss ${q.ideaId}`),
  };
  it('makes a right item solid and a wrong one not yet, and counts a miss against it', async () => {
    const q = quickQuestion({ id: 'diphthong-ou', mode: 'hear' }, mulberry32(1));
    await writeQuick('diphthong-ou', true, q, writer);
    await writeQuick('letter-xi', false, quickQuestion({ id: 'letter-xi', mode: 'see' }, mulberry32(1)), writer);
    expect(calls).toEqual(['answer diphthong-ou true', 'level diphthong-ou solid', 'answer letter-xi false', 'level letter-xi notYet', 'miss letter-xi']);
  });
});

describe('the groups in the store', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.grammarLevels.clear(), db.reviews.clear(), db.settings.clear()]);
  });
  afterEach(clearBus);
  afterAll(() => db.close());

  it('makes the group solid, how inferred, when its last item is', async () => {
    const items = itemsOf('diphthongs').map((i) => i.id);
    for (const id of items.slice(0, -1)) await setLevel(id, 'solid', 'placement');
    expect(await getLevel('diphthongs')).toBeUndefined();
    await setLevel(items[items.length - 1], 'solid', 'placement');
    expect(await getLevel('diphthongs')).toMatchObject({ level: 'solid', how: 'inferred' });
  });

  it('credits the item a word is spelt with, three right reads and it is solid', async () => {
    for (let i = 0; i < 3; i += 1) await noteWordRead('οὐρανός');
    expect(await getLevel('diphthong-ou')).toMatchObject({ level: 'solid', how: 'inferred' });
    expect(await getLevel('diphthong-ai')).toBeUndefined();
  });
});
