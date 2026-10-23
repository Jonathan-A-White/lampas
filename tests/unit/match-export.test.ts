// tests/unit/match-export.test.ts — src/library/matchExport.ts and reasons.ts (mw-rfjjzd.6, docs/design/library-at-scale.md 5.2 and 5.4): a row of his Logos list matches by Resource ID,
// by a series rule or by a type rule, its covers are read from ReferenceSupersets, and every row left over carries the key of a reason the table can say in words.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isListed, matchExport } from '../../src/library/matchExport';
import { readExport, type ExportRow } from '../../src/library/parseExport';
import { lineText, reasonLines, reasonOf, REASONS } from '../../src/library/reasons';
import { CATALOGUE } from '../../src/resources/catalogue';

const FIXTURE = readExport(readFileSync('tests/fixtures/logos-export-head.csv', 'utf8'));

const row = (over: Partial<ExportRow>): ExportRow => ({ resource: 'LLS:X', type: 'text.monograph', abbreviated: '', title: 'A book', series: '', languages: 'en', supersets: '', ...over });
const BDAG = CATALOGUE.find((e) => e.short === 'BDAG')!;

describe('matchExport on the head of his export', () => {
  const { matched, unmatched } = matchExport(FIXTURE);

  it('matches the 22 devotionals by their Resource ID and leaves 38 rows', () => {
    expect(matched).toHaveLength(22);
    expect(matched.every((m) => m.by === 'id' && m.kind === 'devotional' && isListed(m))).toBe(true);
    expect(unmatched).toHaveLength(38);
    expect(matched.length + unmatched.length).toBe(FIXTURE.length);
  });

  it('gives every row it leaves a reason the table can say in words', () => {
    const words = new Set([...REASONS.map((r) => r.key)]);
    for (const u of unmatched) expect(words.has(u.reason), `${u.row.resource} ${u.row.type}: ${u.reason}`).toBe(true);
    expect(reasonLines(unmatched.map((u) => u.reason)).map((l) => [l.key, l.count])).toEqual([['tools', 22], ['data', 16]]);
  });
});

describe('matchExport by id, by series and by type', () => {
  it('matches a book the catalogue lists by its Resource ID and reads its covers from ReferenceSupersets', () => {
    const [m] = matchExport([row({ resource: BDAG.resource, type: 'text.monograph.lexicon', title: 'BDAG', supersets: 'bible.64.1.1-64.21.25' })]).matched;
    expect(m).toMatchObject({ by: 'id', kind: 'lexicon', covers: ['jhn'], entry: BDAG });
  });

  it('matches a commentary volume of a series rule that covers some of the New Testament, and says the catalogue does not list it yet', () => {
    const volume = row({ resource: 'LLS:NEW-PILLAR-VOLUME', type: 'text.monograph.commentary.bible', series: 'Pillar New Testament Commentary', supersets: 'bible.75.1.1-77.3.15' });
    const { matched, unmatched } = matchExport([volume]);
    expect(unmatched).toEqual([]);
    expect(matched).toHaveLength(1);
    expect(matched[0]).toMatchObject({ by: 'series', kind: 'commentary', covers: ['1ti', '2ti', 'tit'] });
    expect(isListed(matched[0])).toBe(false);
  });

  it('lists a series volume once the catalogue has its entry, and then it matches by its Resource ID', () => {
    const volume = row({ resource: 'LLS:NEW-PILLAR-VOLUME', type: 'text.monograph.commentary.bible', series: 'Pillar New Testament Commentary', supersets: 'bible.75.1.1-77.3.15' });
    const entry = { ...BDAG, resource: volume.resource, kind: 'commentary' as const, via: 'series' as const };
    const [m] = matchExport([volume], [...CATALOGUE, entry]).matched;
    expect(m).toMatchObject({ by: 'id', kind: 'commentary', covers: ['1ti', '2ti', 'tit'] });
    expect(isListed(m)).toBe(true);
  });

  it('leaves a volume of a series rule on the Old Testament with the reason old-testament (Calvin on Genesis)', () => {
    const genesis = row({ resource: 'LLS:PILLAR-GEN', type: 'text.monograph.commentary.bible', series: 'Pillar New Testament Commentary', supersets: 'bible.1.1.1-1.50.26' });
    const { matched, unmatched } = matchExport([genesis]);
    expect(matched).toEqual([]);
    expect(unmatched[0].reason).toBe('old-testament');
  });

  it('leaves a commentary of a series no rule names with the reason about the Greek text', () => {
    const { unmatched } = matchExport([row({ resource: 'LLS:OTHER-SERIES', type: 'text.monograph.commentary.bible', series: 'A Series Nobody Asked For', supersets: 'bible.61.1.1-87.22.21' })]);
    expect(unmatched[0].reason).toBe('new-testament-commentaries');
  });

  it('matches a reverse interlinear that covers the New Testament by the type rule, and not one on the Old Testament alone', () => {
    const nt = row({ resource: 'LLS:RI-NT', type: 'lbx.reverse-interlinear', supersets: 'bible+esv.61-87' });
    const ot = row({ resource: 'LLS:RI-OT', type: 'lbx.reverse-interlinear', supersets: 'bible+esv.1-39' });
    const { matched, unmatched } = matchExport([nt, ot]);
    expect(matched.map((m) => [m.row.resource, m.by, m.kind, m.covers.length])).toEqual([['LLS:RI-NT', 'type', 'interlinear', 27]]);
    expect(unmatched.map((u) => [u.row.resource, u.reason])).toEqual([['LLS:RI-OT', 'old-testament']]);
  });

  it('matches an English Bible but not a Bible in another language, which has its reason', () => {
    const english = row({ resource: 'LLS:ENG', type: 'text.monograph.bible', languages: 'en', supersets: 'bible+x.1-87' });
    const hebrew = row({ resource: 'LLS:HEB', type: 'text.monograph.bible', languages: 'la', supersets: 'bible+x.1-87' });
    const { matched, unmatched } = matchExport([english, hebrew]);
    expect(matched.map((m) => [m.row.resource, m.kind])).toEqual([['LLS:ENG', 'bible']]);
    expect(unmatched.map((u) => u.reason)).toEqual(['bibles']);
  });

  it('reads a Resource ID that appears twice once', () => {
    const { matched } = matchExport([row({ resource: BDAG.resource }), row({ resource: BDAG.resource })]);
    expect(matched).toHaveLength(1);
  });
});

describe('the reasons', () => {
  const key = (r: Partial<ExportRow>, covers: string[] = []) => reasonOf(row(r), covers);

  it('say the kinds of book in one sentence each', () => {
    expect(key({ type: 'text.monograph.ancient-manuscript.translation' })).toBe('manuscripts');
    expect(key({ type: 'text.monograph.commentary.bible', supersets: 'bible.1.1.1-39.4.6' })).toBe('old-testament');
    expect(key({ type: 'text.monograph.commentary.bible', supersets: 'bible.61.1.1-61.28.20' }, ['mat'])).toBe('new-testament-commentaries');
    expect(key({ type: 'text.monograph.lexicon' })).toBe('lexicons');
    expect(key({ type: 'text.monograph.grammar' })).toBe('grammars');
    expect(key({ type: 'lbx.interactive' })).toBe('tools');
    expect(key({ type: 'lbx.pronunciations' })).toBe('tools');
    expect(key({ type: 'lbx.media' })).toBe('data');
    expect(key({ type: 'text.serial.journal' })).toBe('books');
    expect(key({ type: 'text.monograph.sermons' })).toBe('books');
  });

  it('read a type the table lacks as books of a kind Lampas does not know', () => {
    expect(key({ type: 'something.new' })).toBe('unknown');
    const [line] = reasonLines(['unknown', 'unknown', 'unknown']);
    expect(lineText(line)).toBe('Books of a kind Lampas does not know (3): it cannot open them yet.');
  });

  it('group the rows most first and list at most 12 lines', () => {
    const keys = ['tools', 'data', 'data', 'books', 'books', 'books'];
    expect(reasonLines(keys).map((l) => [l.key, l.count])).toEqual([['books', 3], ['data', 2], ['tools', 1]]);
    expect(reasonLines([...REASONS.map((r) => r.key), 'unknown', 'made-up']).length).toBeLessThanOrEqual(12);
  });
});
