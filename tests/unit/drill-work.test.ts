// mw-5r3p30.422: Drill it builds each step from the whole passage on each of its tries (drillItems.ts collect: 60 tries a kind), and it used to work out
// the parsing and the table of every word again on every try. The ladder's drills over Romans 8 and 1 John 1 took 12 s alone and timed out at vitest's
// 20 s under a loaded gate. What a code is, and which table holds its ending, depends on the code alone: each is worked out once.
// A wall-clock budget here would fail under load the same way, so this counts the work instead.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { drillSteps } from '../../src/data/grammar/drillIt';
import { LADDER } from '../../src/data/grammar/ladder';

const calls = vi.hoisted(() => ({ splitParse: new Map<string, number>(), ideasOf: new Map<string, number>() }));
const count = (map: Map<string, number>, code: string) => map.set(code, (map.get(code) ?? 0) + 1);

vi.mock('../../src/data/parseCode', async (original) => {
  const real = await original<typeof import('../../src/data/parseCode')>();
  return { ...real, splitParse: (code: string) => (count(calls.splitParse, code), real.splitParse(code)) };
});
vi.mock('../../src/data/grammar/ladder', async (original) => {
  const real = await original<typeof import('../../src/data/grammar/ladder')>();
  return { ...real, ideasOf: (code: string) => (count(calls.ideasOf, code), real.ideasOf(code)) };
});

const rom8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const jn1 = JSON.parse(readFileSync('public/data/1jn/1.json', 'utf8')) as Chapter;

describe('the work of building a drill', () => {
  it('parses each code of the passage once, and finds its table once, over every drill of the ladder', () => {
    for (const idea of LADDER) drillSteps(idea.id, { passage: [rom8, jn1], seed: 3 });
    const most = (map: Map<string, number>) => Math.max(0, ...map.values());
    expect(calls.splitParse.size, 'some code was parsed').toBeGreaterThan(0);
    // once by the drill's questions (questions.ts parsedOf), and once inside each of the two ideasOf calls below (ladder.ts ideasOf parses the code)
    expect(most(calls.splitParse), 'splitParse calls for the code asked most').toBeLessThanOrEqual(3);
    // once for its ideas (questions.ts needsIdea) and once for its table (paradigms tableFor)
    expect(most(calls.ideasOf), 'ideasOf calls for the code asked most').toBeLessThanOrEqual(2);
  });
});
