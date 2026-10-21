// The Conversations screen's data (mw-5r3p30.696): every kept conversation newest first with its place in words, and a search of their questions and answers.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { addTurn, listConversations, searchConversations } from '../../src/data/repositories';
import { talkLabel } from '../../src/share/talkPlace';

beforeEach(() => db.talks.clear());
afterAll(() => db.close());

describe('listConversations', () => {
  it('lists one row per conversation, the newest last turn first, each named by its place and showing its last question', async () => {
    await addTurn('rom.8.28', 'First about the verse?', 'a', [], 1000);
    await addTurn('rom.8.1-11', 'What is this passage about?', 'a', [], 2000);
    await addTurn('rom.8.1-11:quiz', 'Quiz me on it.', 'a', [], 3000);
    await addTurn('screen.goal', 'raw words', 'a', [], 4000, { changes: [], refused: [], cleanQ: 'What should I learn next?' });
    await addTurn('rom.8.28', 'And a second question?\nWith a second line.', 'a', [], 5000);
    const rows = await listConversations();
    expect(rows.map((row) => row.ref)).toEqual(['rom.8.28', 'screen.goal', 'rom.8.1-11:quiz', 'rom.8.1-11']);
    expect(rows.map((row) => talkLabel(row.ref))).toEqual(['Romans 8:28', 'Ask the tutor: Goal', 'Quiz on Romans 8:1-11', 'Romans 8:1-11']);
    expect(rows.map((row) => row.lastWhen)).toEqual([5000, 4000, 3000, 2000]);
    expect(rows[0]).toMatchObject({ firstQuestion: 'First about the verse?', lastQuestion: 'And a second question?\nWith a second line.' });
    expect(rows[1]?.lastQuestion).toBe('What should I learn next?');
  });

  it('keeps only the newest `limit` when asked', async () => {
    for (let i = 1; i <= 5; i++) await addTurn(`rom.8.${i}`, `Question ${i}`, 'a', [], i * 1000);
    expect((await listConversations(3)).map((row) => row.ref)).toEqual(['rom.8.5', 'rom.8.4', 'rom.8.3']);
    expect(await listConversations()).toHaveLength(5);
  });

  it('lists nothing when no talk was had', async () => {
    expect(await listConversations()).toEqual([]);
  });
});

describe('searchConversations', () => {
  async function seed(): Promise<void> {
    await addTurn('rom.8.28', 'Why do things work together?', 'It is a matter of God’s Grace.\nThe verb is συνεργεῖ.', [], 1000);
    await addTurn('rom.5.1', 'What is peace with God?', 'It comes through faith, not through works.', [], 2000);
    await addTurn('screen.goal', 'Tell me about GRACE', 'Grace is the free favour of God.', [], 3000);
    await addTurn('rom.8.28', 'What is the subject?', 'God, who works all things.', [], 4000);
  }

  it('returns only conversations with the word in a question or an answer, case-insensitive, newest first, each with its matching line', async () => {
    await seed();
    const hits = await searchConversations('grace');
    expect(hits.map((hit) => hit.ref)).toEqual(['rom.8.28', 'screen.goal']);
    expect(hits[0]?.line).toBe('It is a matter of God’s Grace.');
    expect(hits[0]).toMatchObject({ lastWhen: 4000, lastQuestion: 'What is the subject?' });
    expect(hits[1]?.line).toBe('Tell me about GRACE');
  });

  it('finds Greek and needs every word typed to be on one turn', async () => {
    await seed();
    expect((await searchConversations('συνεργεῖ')).map((hit) => hit.ref)).toEqual(['rom.8.28']);
    expect((await searchConversations('free favour')).map((hit) => hit.ref)).toEqual(['screen.goal']);
    expect(await searchConversations('free peace')).toEqual([]);
  });

  it('matches the question as the tutor cleaned it and as he said it', async () => {
    await addTurn('rom.8', 'raw spoken words about mercy', 'a', [], 1000, { changes: [], refused: [], cleanQ: 'What is mercy?' });
    expect((await searchConversations('spoken')).map((hit) => hit.ref)).toEqual(['rom.8']);
    expect((await searchConversations('MERCY')).map((hit) => hit.ref)).toEqual(['rom.8']);
  });

  it('cuts a long matching line around the word', async () => {
    const long = `${'before '.repeat(40)}grace${' after'.repeat(40)}`;
    await addTurn('rom.8', 'q', long, [], 1000);
    const [hit] = await searchConversations('grace');
    expect(hit?.line.length).toBeLessThan(long.length);
    expect(hit?.line).toContain('grace');
    expect(hit?.line.startsWith('…')).toBe(true);
    expect(hit?.line.endsWith('…')).toBe(true);
  });

  it('finds nothing for words nobody said and for an empty search', async () => {
    await seed();
    expect(await searchConversations('zzzz')).toEqual([]);
    expect(await searchConversations('   ')).toEqual([]);
  });
});
