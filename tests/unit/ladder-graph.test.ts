// The ladder as a graph (mw-foy5mb.5): layout by depth taking a path as data, and the one state function a node's colour reads.
import { describe, expect, it } from 'vitest';
import { ideaState, STATE_NAMES } from '../../src/data/grammar/goalProgress';
import { LADDER } from '../../src/data/grammar/ladder';
import { layoutPath, makePath, NODE_H, ROW_GAP } from '../../src/data/grammar/pathGraph';
import type { Level } from '../../src/data/grammar/needs';

// a (needs nothing) <- b, c <- d <- e, where e also rests directly on a
const FIVE = makePath([
  { id: 'a', needs: [] },
  { id: 'b', needs: ['a'] },
  { id: 'c', needs: ['a'] },
  { id: 'd', needs: ['b', 'c'] },
  { id: 'e', needs: ['d', 'a'] },
]);

describe('layoutPath', () => {
  const layout = layoutPath(FIVE);
  const node = (id: string) => layout.nodes.find((n) => n.id === id)!;

  it('puts an idea at its depth: one row below the deepest idea it needs', () => {
    expect(layout.nodes.map((n) => [n.id, n.depth])).toEqual([['a', 0], ['b', 1], ['c', 1], ['d', 2], ['e', 3]]);
  });

  it('draws every need as an edge from the need to the idea that rests on it, once', () => {
    expect(layout.edges.map((e) => `${e.from}>${e.to}`).sort()).toEqual(['a>b', 'a>c', 'a>e', 'b>d', 'c>d', 'd>e']);
  });

  it('keeps an idea below all it needs and ideas of one row apart', () => {
    for (const edge of layout.edges) expect(node(edge.to).y).toBeGreaterThanOrEqual(node(edge.from).y + NODE_H + ROW_GAP);
    const [b, c] = [node('b'), node('c')];
    expect(b.y).toBe(c.y);
    expect(Math.abs(b.x - c.x)).toBeGreaterThanOrEqual(b.width);
  });

  it('is deterministic and measures the whole drawing', () => {
    expect(layoutPath(FIVE)).toEqual(layout);
    for (const n of layout.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.x + n.width).toBeLessThanOrEqual(layout.width);
      expect(n.y + NODE_H).toBeLessThanOrEqual(layout.height);
    }
  });
});

describe('the Lampas ladder as a graph', () => {
  const layout = layoutPath(makePath(LADDER));

  it('draws every idea of ladder.ts once and every need as an edge', () => {
    expect(layout.nodes.map((n) => n.id).sort()).toEqual(LADDER.map((i) => i.id).sort());
    expect(layout.edges).toHaveLength(LADDER.reduce((sum, i) => sum + i.needs.length, 0));
  });

  it('never lets two ideas overlap in a row', () => {
    const rows = new Map<number, typeof layout.nodes>();
    for (const n of layout.nodes) rows.set(n.depth, [...(rows.get(n.depth) ?? []), n]);
    for (const row of rows.values()) {
      const sorted = [...row].sort((p, q) => p.x - q.x);
      for (let i = 1; i < sorted.length; i += 1) expect(sorted[i].x).toBeGreaterThanOrEqual(sorted[i - 1].x + sorted[i - 1].width);
    }
  });
});

describe('ideaState: solid, learning, next, not yet', () => {
  const levels = (entries: [string, Level][]) => new Map(entries);

  it('reads the level the same way Learn does: frontier is learning, solid is solid', () => {
    expect(ideaState('noun', levels([['noun', 'solid']]))).toBe('solid');
    expect(ideaState('noun', levels([['noun', 'frontier']]))).toBe('learning');
  });

  it('calls an idea next when it is not yet and everything it rests on is solid', () => {
    const idea = LADDER.find((i) => i.needs.length > 0 && !i.parent && !i.glyphs)!;
    const solid = levels(idea.needs.map((id): [string, Level] => [id, 'solid']));
    expect(ideaState(idea.id, solid)).toBe('next');
    expect(ideaState(idea.id, new Map())).toBe('notYet');
  });

  it('calls a letter solid when he marked The Greek alphabet known and the letter has no level of its own (mw-5r3p30.641)', () => {
    const alphabet = levels([['alphabet', 'solid']]);
    expect(ideaState('letter-omicron', alphabet)).toBe('solid');
    expect(ideaState('letter-omicron', levels([['alphabet', 'solid'], ['letter-omicron', 'notYet']]))).toBe('solid');
    expect(ideaState('letter-omicron', new Map())).not.toBe('solid');
  });

  it('names each state in words, so colour is never the only sign', () => {
    expect(STATE_NAMES).toEqual({ solid: 'Solid', learning: 'Learning', next: 'Next', notYet: 'Not yet' });
  });
});
