// The gap audit (mw-foy5mb.3, docs/path-gaps.md): every BMA Tutor lesson is in the first table, every book chapter in the second,
// and every idea proposed in section (c) fits the ladder's graph.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bmaTutor } from '../../src/approaches/bma-tutor';
import { LADDER, TIERS } from '../../src/data/grammar/ladder';

const DOC = readFileSync('docs/path-gaps.md', 'utf8');
const IDS = new Set(LADDER.map((i) => i.id));
const VERDICTS = ['covered', 'partly', 'gap'];

const section = (doc: string, heading: string): string => {
  const start = doc.indexOf(`\n## ${heading}`);
  if (start < 0) return '';
  const rest = doc.slice(start + 1);
  const next = rest.indexOf('\n## ', 3);
  return next < 0 ? rest : rest.slice(0, next);
};
const cells = (row: string): string[] => row.split('|').slice(1, -1).map((c) => c.trim());
const rowsOf = (text: string): string[][] => text.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| ---')).map(cells);
const idsIn = (text: string): string[] => [...text.matchAll(/`([a-z][a-z0-9-]*)`/g)].map((m) => m[1]);

/** The lessons of bma-tutor.ts as [stage, level, lesson] triples. */
const LESSONS = bmaTutor.stages.flatMap((s) => s.levels.flatMap((l) => l.lessons.map((le) => [s.title, l.title, le.title] as const)));

/** The lessons the doc's first table leaves out. */
function missingLessons(doc: string): string[] {
  const rows = rowsOf(section(doc, '(a) BMA Tutor'));
  return LESSONS.filter(([s, l, t]) => !rows.some((r) => r[0] === s && r[1] === l && r[2] === t)).map(([, , t]) => t);
}

const proposed = (doc: string): { id: string; tier: string; needs: string[] }[] => {
  const block = /```text\n([\s\S]*?)```/.exec(section(doc, '(c) The gaps'))?.[1] ?? '';
  return block
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => {
      const [id, tier, needs] = l.split('|').map((p) => p.trim());
      return { id, tier, needs: needs.split(',').map((n) => n.trim()).filter(Boolean) };
    });
};

describe('docs/path-gaps.md', () => {
  it('has the three sections', () => {
    for (const h of ['(a) BMA Tutor', '(b) The grammar book', '(c) The gaps']) expect(section(DOC, h)).not.toBe('');
  });

  it('has a row for every bma-tutor.ts lesson, and the check notices a title removed', () => {
    expect(LESSONS.length).toBeGreaterThan(70);
    expect(missingLessons(DOC)).toEqual([]);
    const title = LESSONS[5][2];
    expect(missingLessons(DOC.replace(`| ${title} |`, '| something else |'))).toEqual([title]);
  });

  it('gives each lesson and chapter row a verdict, and every id it names is a ladder idea or a proposed one', () => {
    const known = new Set([...IDS, ...proposed(DOC).map((p) => p.id)]);
    for (const [name, rows] of [['a', rowsOf(section(DOC, '(a) BMA Tutor')).slice(1)], ['b', rowsOf(section(DOC, '(b) The grammar book')).slice(1)]] as const) {
      expect(rows.length, name).toBeGreaterThan(20);
      for (const r of rows) {
        const verdict = r[r.length - 2];
        expect(VERDICTS, `${name}: ${r[r.length - 4]}`).toContain(verdict);
        for (const id of idsIn(r.join(' | '))) expect(known.has(id), `${name}: ${id}`).toBe(true);
        if (verdict !== 'covered') expect(r[r.length - 1], `${name}: ${verdict} row without a gap`).not.toBe('');
      }
    }
  });

  it('lists the 26 chapters of the book in order', () => {
    const rows = rowsOf(section(DOC, '(b) The grammar book')).slice(1);
    expect(rows.map((r) => r[0])).toEqual(Array.from({ length: 26 }, (_, i) => String(i + 1)));
  });

  it('proposes ideas that fit the graph: a new id, a ladder tier, needs that exist, no cycle', () => {
    const list = proposed(DOC);
    expect(list.length).toBeGreaterThan(0);
    const ids = list.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of list) {
      expect(IDS.has(p.id), `${p.id} is already in the ladder`).toBe(false);
      expect(TIERS as readonly string[], p.id).toContain(p.tier);
      expect(p.needs.length, p.id).toBeGreaterThan(0);
      for (const n of p.needs) expect(IDS.has(n) || ids.includes(n), `${p.id} needs ${n}`).toBe(true);
    }
    const needsOf = new Map(list.map((p) => [p.id, p.needs]));
    const visiting = new Set<string>();
    const done = new Set<string>();
    const visit = (id: string): void => {
      if (done.has(id) || !needsOf.has(id)) return;
      expect(visiting.has(id), `cycle at ${id}`).toBe(false);
      visiting.add(id);
      for (const n of needsOf.get(id) ?? []) visit(n);
      visiting.delete(id);
      done.add(id);
    };
    ids.forEach(visit);
  });

  it('describes every proposed idea in the table of section (c), and every gap named above is proposed', () => {
    const c = section(DOC, '(c) The gaps');
    const table = rowsOf(c.slice(0, c.indexOf('```'))).slice(1);
    const ids = proposed(DOC).map((p) => p.id);
    expect(table.map((r) => r[1].replace(/`/g, ''))).toEqual(ids);
    const a = section(DOC, '(a) BMA Tutor') + section(DOC, '(b) The grammar book');
    for (const row of rowsOf(a)) for (const id of idsIn(row[row.length - 1] ?? '')) expect(ids, id).toContain(id);
  });
});
