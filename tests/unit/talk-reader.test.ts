// The kept talks as a voice-kit TalkReader (mw-o480n1.8): list() one summary per conversation, get(ref) the pairs as user and assistant turns,
// and the kit's searchTalks over them with Lampas's places, fold and 120-character line.
import { searchTalks } from 'voice-kit/talks';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { addTurn, searchConversations } from '../../src/data/repositories';
import { bibleTalks, conversationSearch } from '../../src/data/repositories/talkReader';

beforeEach(() => db.talks.clear());
afterAll(() => db.close());

async function seed(): Promise<void> {
  await addTurn('rom.8.28', 'raw first words', 'It is a matter of God’s Grace.\nThe verb is συνεργεῖ.', [], 1000, { changes: [{ key: 'textSize', label: 'Text size', from: 18, to: 20, shown: 'Text size: 20' }], refused: [], cleanQ: 'Why do things work together?', spoken: true });
  await addTurn('rom.5.1', 'What is peace with God?', 'It comes through faith, not through works.', [], 2000);
  await addTurn('screen.goal', 'Tell me about GRACE', 'Grace is the free favour of God.', [], 3000);
  await addTurn('rom.8.28', 'What is the subject?', 'God, who works all things.', [], 4000);
}

describe('bibleTalks.list', () => {
  it('gives one summary per conversation, newest first, with the first and last question in its fields', async () => {
    await seed();
    const list = await bibleTalks.list();
    expect(list.map((s) => s.id)).toEqual(['rom.8.28', 'screen.goal', 'rom.5.1']);
    expect(list.map((s) => s.turnCount)).toEqual([4, 2, 2]);
    expect(list[0]).toMatchObject({
      title: '',
      firstText: 'Why do things work together?',
      createdAt: 1000,
      updatedAt: 4000,
      fields: { firstQuestion: 'Why do things work together?', lastQuestion: 'What is the subject?' },
    });
    expect((await bibleTalks.list({ limit: 2 })).map((s) => s.id)).toEqual(['rom.8.28', 'screen.goal']);
  });

  it('lists nothing when no talk was had', async () => {
    expect(await bibleTalks.list()).toEqual([]);
  });
});

describe('bibleTalks.get', () => {
  it('gives the pairs as user and assistant turns, the Bible fields on them', async () => {
    await seed();
    const talk = await bibleTalks.get('rom.8.28');
    expect(talk?.turns.map((t) => t.role)).toEqual(['user', 'assistant', 'user', 'assistant']);
    expect(talk?.turns.map((t) => t.text)).toEqual(['raw first words', 'It is a matter of God’s Grace.\nThe verb is συνεργεῖ.', 'What is the subject?', 'God, who works all things.']);
    expect(talk?.turns.map((t) => t.at)).toEqual([1000, 1000, 4000, 4000]);
    expect(talk?.turns[0]?.fields).toEqual({ cleanQ: 'Why do things work together?', spoken: true });
    expect(talk?.turns[2]?.fields).toEqual({});
    const assistant = talk?.turns[1]?.fields as { id?: number; words?: unknown[]; changes?: unknown[] };
    expect(typeof assistant.id).toBe('number');
    expect(assistant.words).toEqual([]);
    expect(assistant.changes).toHaveLength(1);
    expect(talk).toMatchObject({ id: 'rom.8.28', title: '', createdAt: 1000, updatedAt: 4000, memory: { facts: [], summary: '' } });
  });

  it('gives undefined for a conversation not kept', async () => {
    await seed();
    expect(await bibleTalks.get('rom.1.1')).toBeUndefined();
  });
});

describe('searchTalks over bibleTalks', () => {
  it('finds the same conversations and lines as searchConversations', async () => {
    await seed();
    for (const query of ['grace', 'free favour', 'συνεργεῖ', 'spoken', 'MERCY', 'free peace', '  ']) {
      const hits = await searchTalks(bibleTalks, query, conversationSearch);
      const old = await searchConversations(query);
      expect(hits.map((hit) => hit.id)).toEqual(old.map((hit) => hit.ref));
      expect(hits.map((hit) => hit.matches[hit.matches.length - 1]?.snippet)).toEqual(old.map((hit) => hit.line));
    }
    expect((await searchTalks(bibleTalks, 'grace', conversationSearch)).map((h) => h.id)).toEqual(['rom.8.28', 'screen.goal']);
  });

  it('keeps every matching pair of a conversation', async () => {
    await addTurn('rom.8', 'q1 grace', 'a', [], 1000);
    await addTurn('rom.8', 'q2', 'grace again', [], 2000);
    await addTurn('rom.8', 'q3', 'nothing', [], 3000);
    const [hit] = await searchTalks(bibleTalks, 'grace', conversationSearch);
    expect(hit?.matchCount).toBe(2);
    expect(hit?.matches.map((m) => m.turn)).toEqual([0, 2]);
  });
});
