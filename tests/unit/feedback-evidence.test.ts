// His memorizing evidence on Settings > Ask for more (mw-fu7dqf.12, his Q4 addition): with the switch Off the request has no evidence; On it carries the summary line and the recalls, under their budget, and
// the feedback input schema accepts both. The recalls are the `recalls` table's (src/data/repositories/memorize.ts); src/memorize/evidence.ts cuts them to what a request can carry.
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, type RecallRow } from '../../src/data/db';
import { EVIDENCE_BYTES, EVIDENCE_RECALLS, evidenceSummary, memorizeEvidence, memorizingEvidenceNow } from '../../src/memorize/evidence';
import { buildMoreRequest } from '../../src/services/feedback';
import { validate, type Schema } from '../support/schema-validate';

const input = JSON.parse(readFileSync('grinds/feedback.input.schema.json', 'utf8')) as Schema;
const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 1, 12, 0, 0);
const bytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await db.recalls.clear();
});

/** `n` recalls of one verse in one language, a day apart from `from` (the first with gap 0, the rest with `gap`), the first `passed` of them right. */
const recalls = (ref: string, lang: string, n: number, over: { from?: number; gap?: number; passed?: number; missed?: string[] } = {}): RecallRow[] =>
  Array.from({ length: n }, (_, i) => ({
    ref,
    lang,
    when: (over.from ?? T0) + i * DAY,
    rung: Math.min(6, i),
    score: i < (over.passed ?? n) ? 1 : 0.5,
    missed: i < (over.passed ?? n) ? [] : (over.missed ?? ['ἀγαπῶσιν']),
    asked: [{ token: 'all', lang }],
    gap: i === 0 ? 0 : (over.gap ?? 1),
    how: 'said',
  }));

describe('evidenceSummary', () => {
  it('is one line: verses, recalls, passes and the gaps between recalls', async () => {
    await db.recalls.bulkAdd([...recalls('Rom.8.28', 'en', 6, { passed: 5, gap: 1 }), ...recalls('Rom.8.28', 'el', 3, { gap: 3 }), ...recalls('John.3.16', 'en', 5, { gap: 7 })]);
    expect(await evidenceSummary()).toBe('2 verses, 14 recalls, 13 passed, gaps 1 to 7 days');
  });

  it('counts three verses and eleven passes as the story’s own line has it', async () => {
    await db.recalls.bulkAdd([...recalls('Rom.8.28', 'en', 5, { passed: 4, gap: 1 }), ...recalls('John.3.16', 'en', 5, { passed: 3, gap: 7 }), ...recalls('Phil.4.13', 'en', 4, { passed: 4, gap: 2 })]);
    expect(await evidenceSummary()).toBe('3 verses, 14 recalls, 11 passed, gaps 1 to 7 days');
  });

  it('says so before the first recall, and is singular for one', async () => {
    expect(await evidenceSummary()).toBe('No recalls yet');
    await db.recalls.bulkAdd(recalls('Rom.8.28', 'en', 1));
    expect(await evidenceSummary()).toBe('1 verse, 1 recall, 1 passed');
  });

  it('names one gap by itself', async () => {
    await db.recalls.bulkAdd(recalls('Rom.8.28', 'en', 3, { gap: 2 }));
    expect(await evidenceSummary()).toBe('1 verse, 3 recalls, 3 passed, gap 2 days');
  });
});

describe('memorizeEvidence', () => {
  it('lists each verse in each language with its recalls, the most recently recalled first, the recalls oldest first', async () => {
    await db.recalls.bulkAdd([...recalls('Rom.8.28', 'en', 2), ...recalls('John.3.16', 'el', 2, { from: T0 + 10 * DAY })]);
    const evidence = await memorizeEvidence();
    expect(evidence.map((v) => `${v.lang}:${v.ref}`)).toEqual(['el:John.3.16', 'en:Rom.8.28']);
    expect(evidence[1].recalls.map((r) => r.on)).toEqual(['2026-10-01', '2026-10-02']);
    expect(evidence[1].recalls[0]).toEqual({ on: '2026-10-01', rung: 0, score: 1, gap: 0, how: 'said' });
  });

  it('names the words missed and rounds the score', async () => {
    await db.recalls.add({ ...recalls('Rom.8.28', 'weave', 1)[0], score: 0.8333, missed: ['good', 'ἀγαθόν'] });
    expect((await memorizeEvidence())[0].recalls[0]).toMatchObject({ score: 0.83, missed: ['good', 'ἀγαθόν'] });
  });

  it('keeps at most the last 30 recalls of a verse', async () => {
    await db.recalls.bulkAdd(recalls('Rom.8.28', 'en', 45));
    const [verse] = await memorizeEvidence();
    expect(verse.recalls).toHaveLength(EVIDENCE_RECALLS);
    expect(verse.recalls[0].on).toBe('2026-10-16');
    expect(verse.recalls[29].on).toBe('2026-11-14');
  });

  it('stays under the byte budget however much he has recalled', async () => {
    const refs = Array.from({ length: 40 }, (_, i) => `Rom.8.${i + 1}`);
    await db.recalls.bulkAdd(refs.flatMap((ref) => ['en', 'el', 'weave'].flatMap((lang) => recalls(ref, lang, 30, { passed: 20, missed: ['ἀγαπῶσιν', 'συνεργεῖ', 'κατὰ'] }))));
    const evidence = await memorizeEvidence();
    expect(bytes(evidence)).toBeLessThanOrEqual(EVIDENCE_BYTES);
    expect(evidence.length).toBeGreaterThan(0);
  });
});

describe('the ask with and without his evidence', () => {
  it('carries no evidence with the switch Off', () => {
    const request = buildMoreRequest('text', 'The Septuagint', 'To read it beside the Greek.', '');
    expect(request).not.toHaveProperty('memorizing');
    expect(validate(request, input)).toEqual([]);
  });

  it('carries the summary and the evidence with the switch On, under the budget, and the schema accepts it', async () => {
    await db.recalls.bulkAdd([...recalls('Rom.8.28', 'en', 12, { passed: 9 }), ...recalls('Rom.8.28', 'weave', 4), ...recalls('John.3.16', 'el', 8, { gap: 3 })]);
    const request = buildMoreRequest('approach', 'The Polis method', '', '', await memorizingEvidenceNow());
    expect(request.memorizing?.summary).toBe('2 verses, 24 recalls, 21 passed, gaps 1 to 3 days');
    expect(request.memorizing?.evidence.map((v) => `${v.lang}:${v.ref}`).sort()).toEqual(['el:John.3.16', 'en:Rom.8.28', 'weave:Rom.8.28']);
    expect(bytes(request.memorizing?.evidence)).toBeLessThanOrEqual(EVIDENCE_BYTES);
    expect(validate(request, input)).toEqual([]);
  });

  it('with the most he can have recalled, is still a request the grist takes: under half its 20 KiB payload', async () => {
    const refs = Array.from({ length: 40 }, (_, i) => `Rom.8.${i + 1}`);
    await db.recalls.bulkAdd(refs.flatMap((ref) => ['en', 'el', 'weave'].flatMap((lang) => recalls(ref, lang, 30, { passed: 20 }))));
    const request = buildMoreRequest('translation', 'Ω'.repeat(120), 'α'.repeat(1200), `https://example.org/${'a'.repeat(280)}`, await memorizingEvidenceNow());
    expect(validate(request, input)).toEqual([]);
    expect(bytes(request)).toBeLessThan(10 * 1024);
  });

  it('is refused by the schema when the evidence has a key it does not list, or comes on a form that is not an Ask for more', async () => {
    const evidence = { summary: '1 verse, 1 recall, 1 passed', evidence: [{ ref: 'Rom.8.28', lang: 'en', recalls: [{ on: '2026-10-01', rung: 0, score: 1, gap: 0, how: 'said' }] }] };
    expect(validate({ kind: 'text', name: 'x', memorizing: evidence, app_version: 'v' }, input)).toEqual([]);
    expect(validate({ kind: 'text', name: 'x', memorizing: { ...evidence, extra: 1 }, app_version: 'v' }, input)).not.toEqual([]);
    expect(validate({ kind: 'text', name: 'x', memorizing: { summary: 's' }, app_version: 'v' }, input)).not.toEqual([]);
    expect(validate({ kind: 'book', title: 'x', memorizing: evidence, app_version: 'v' }, input)).not.toEqual([]);
  });
});
