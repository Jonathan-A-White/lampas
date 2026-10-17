// tests/unit/ladder-single-source.test.ts — the ladder is the one source (mw-svw421.9): adding an idea is one entry in src/data/grammar/ladder.ts, and its teach
// card, its row in docs/card-audit.md, the ladder table of docs/grammar.md and the built grinds follow from it. This fails, naming the idea and the file, on
// anything stale. The graph functions (pathGraph.ts) take the path as data, so a second, tiny path gets the same answers. `npm run ladder:docs && npm run grind:build`.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LADDER } from '../../src/data/grammar/ladder';
import { belowIn, depthIn, frontierIn, ideaIn, makePath, needsIn, pathProblems, type PathIdea } from '../../src/data/grammar/pathGraph';
import { teachOf } from '../../src/data/grammar/teach';
import { AUDIT_DOC, GRAMMAR_DOC, ladderProblems, withAuditTable, withGrammarTable, type LadderSources } from '../../scripts/ladder-docs-text';

const SCHEMAS = ['grinds/bible-talk.answer.schema.json', 'grinds/verse-ask.answer.schema.json'];

const real = (): LadderSources => ({
  ladder: LADDER,
  cardIds: new Set(
    LADDER.filter((i) => {
      try {
        teachOf(i.id);
        return true;
      } catch {
        return false;
      }
    }).map((i) => i.id),
  ),
  grammarDoc: readFileSync(GRAMMAR_DOC, 'utf8'),
  auditDoc: readFileSync(AUDIT_DOC, 'utf8'),
  schemas: Object.fromEntries(SCHEMAS.map((file) => [file, JSON.parse(readFileSync(file, 'utf8')) as object])),
});

describe('the ladder is the single source', () => {
  it('has nothing stale: every idea has its card, its rows and its place in the built grinds', () => {
    expect(ladderProblems(real())).toEqual([]);
  });

  it('is what npm run ladder:docs writes (the docs change nothing)', () => {
    const { grammarDoc, auditDoc } = real();
    expect(withGrammarTable(grammarDoc, LADDER)).toBe(grammarDoc);
    expect(withAuditTable(auditDoc, LADDER)).toBe(auditDoc);
  });

  it('names the idea and the file for an idea with no card', () => {
    const src = real();
    const gone = LADDER[40].id;
    const problems = ladderProblems({ ...src, cardIds: new Set([...src.cardIds].filter((id) => id !== gone)) });
    expect(problems).toEqual([`${gone}: no teach card; add one in src/data/grammar/teach/${LADDER[40].tier}.ts`]);
  });

  it('names the idea and the file for an edited audit row, a missing row and a table row of the wrong rung', () => {
    const src = real();
    const id = LADDER[7].id;
    const edited = ladderProblems({ ...src, auditDoc: src.auditDoc.replace(`| \`${id}\` | ${LADDER[7].title} |`, `| \`${id}\` | ${LADDER[7].title} (edited) |`) });
    expect(edited.join('\n')).toContain(`${id}: its row in docs/card-audit.md differs from the ladder's`);

    const noRow = ladderProblems({ ...src, auditDoc: src.auditDoc.split('\n').filter((l) => !l.startsWith(`| \`${id}\` |`)).join('\n') });
    expect(noRow).toEqual([`${id}: no row in docs/card-audit.md; run npm run ladder:docs`]);

    const moved = ladderProblems({ ...src, grammarDoc: src.grammarDoc.replace(new RegExp(`^\\| ${LADDER[7].rung} \\| `, 'm'), '| 99 | ') });
    expect(moved.join('\n')).toContain(`${id}: its row in docs/grammar.md differs from the ladder's`);
  });

  it('keeps the audit verdicts when a new idea is added, and gives the new one a row to judge', () => {
    const src = real();
    const added = [...LADDER.slice(0, 5), { id: 'brand-new', title: 'Brand new', tier: 'letters', rung: 6, terms: [], needs: ['alphabet'] }, ...LADDER.slice(5)].map((i, n) => ({ ...i, rung: n + 1 }));
    const audit = withAuditTable(src.auditDoc, added);
    expect(audit).toContain('| `brand-new` | Brand new | teaches a beginner | New, so no card before it; judge the card by hand. |');
    const was = src.auditDoc.split('\n').filter((l) => l.startsWith('| `letter-upsilon` |'));
    expect(audit.split('\n').filter((l) => l.startsWith('| `letter-upsilon` |'))).toEqual(was);
  });

  it('fails on grinds built before the ladder changed', () => {
    const src = real();
    const file = SCHEMAS[0];
    const old = JSON.parse(JSON.stringify(src.schemas[file])) as { properties: { bridge: { properties: { next: { enum: string[] } } } } };
    old.properties.bridge.properties.next.enum = old.properties.bridge.properties.next.enum.filter((id) => id !== 'tense-aorist');
    const problems = ladderProblems({ ...src, schemas: { [file]: old } });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(`${file}: bridge next is older than the ladder (missing tense-aorist; not on the ladder none)`);
  });

  it('fails on a need that names an unknown idea, and on a cycle (the ladder must stay a DAG)', () => {
    const src = real();
    const unknown = ladderProblems({ ...src, ladder: src.ladder.map((i) => (i.id === 'noun' ? { ...i, needs: [...i.needs, 'nonesuch'] } : i)) });
    expect(unknown).toContain('src/data/grammar/ladder.ts: noun needs nonesuch, which is not an idea of the path');

    // the aorist rests on the imperfect; make the imperfect rest on the aorist
    const cycle = ladderProblems({ ...src, ladder: src.ladder.map((i) => (i.id === 'tense-imperfect' ? { ...i, needs: [...i.needs, 'tense-aorist'] } : i)) });
    expect(cycle.join('\n')).toContain('src/data/grammar/ladder.ts: cycle: tense-imperfect needs tense-aorist needs tense-imperfect');
  });
});

describe('the graph functions take the path as data', () => {
  const mini = JSON.parse(readFileSync('tests/support/mini-path.json', 'utf8')) as { ideas: PathIdea[] };

  it('answers for a path of three ideas from another data file, with no Lampas id anywhere', () => {
    const path = makePath(mini.ideas);
    expect(path.ideas.map((i) => i.id)).toEqual(['sow', 'water', 'reap']);
    expect(needsIn(path, 'reap').map((i) => i.id)).toEqual(['sow', 'water']);
    expect(belowIn(path, 'reap').map((i) => i.id)).toEqual(['sow', 'water']);
    expect(['sow', 'water', 'reap'].map((id) => depthIn(path, id))).toEqual([0, 1, 2]);
    expect(frontierIn(path, new Set()).map((i) => i.id)).toEqual(['sow']);
    expect(frontierIn(path, new Set(['sow'])).map((i) => i.id)).toEqual(['water']);
    expect(frontierIn(path, new Set(['sow', 'water'])).map((i) => i.id)).toEqual(['reap']);
    expect(frontierIn(path, new Set(['sow', 'water', 'reap']))).toEqual([]);
    expect(() => ideaIn(path, 'ploughed')).toThrow(/Unknown idea/);
  });

  it('refuses a cycle, a need on itself, an unknown need and an idea listed twice, naming each', () => {
    expect(pathProblems([{ id: 'a', needs: ['b'] }, { id: 'b', needs: ['c'] }, { id: 'c', needs: ['a'] }])).toEqual(['cycle: a needs b needs c needs a']);
    expect(pathProblems([{ id: 'a', needs: ['a'] }])).toEqual(['cycle: a needs a']);
    expect(pathProblems([{ id: 'a', needs: ['z'] }])).toEqual(['a needs z, which is not an idea of the path']);
    expect(pathProblems([{ id: 'a', needs: [] }, { id: 'a', needs: [] }])).toEqual(['a is listed twice']);
    expect(() => makePath([{ id: 'a', needs: ['b'] }, { id: 'b', needs: ['a'] }])).toThrow(/cycle: a needs b needs a/);
  });

  it('is the same graph the Lampas ladder uses: its depth runs from 0 up, and its frontier at the start is the alphabet', () => {
    const path = makePath(LADDER);
    expect(depthIn(path, 'alphabet')).toBe(0);
    expect(depthIn(path, 'letter-alpha')).toBe(1);
    expect(frontierIn(path, new Set()).map((i) => i.id)).toEqual(['alphabet']);
  });
});
