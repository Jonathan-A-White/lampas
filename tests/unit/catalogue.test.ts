// tests/unit/catalogue.test.ts — the Logos catalogue (mw-rfjjzd.2, docs/design/library-at-scale.md 3.1): the rules file names every id the app opens today, the
// tool writes the seven kinds from the rules and an export and a second run changes nothing, the generated kinds are sound (no duplicate Resource ID, a value
// line each, covers codes that are books, grammar sections that are ladder ideas), and the five old exports are views over it that still equal what they were.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BOOKS } from '../../src/data/books';
import { DEVOTIONALS } from '../../src/data/daily/devotionals';
import { LADDER } from '../../src/data/grammar/ladder';
import { CATALOGUE, CATALOGUE_VERSION, KINDS, WORK_GROUPS, entriesOf, type CatalogueEntry, type Kind, type KindFile } from '../../src/resources/catalogue';
import { DEFAULT_GRAMMAR_BOOKS, GRAMMAR_BOOKS } from '../../src/resources/grammarBooks';
import { LEXICONS } from '../../src/resources/logos';
import { COMMON_BIBLES, DEFAULT_LOGOS_BIBLE } from '../../src/resources/logosBible';
import { WORKS } from '../../src/resources/works';
import { buildCatalogue, coversOfSupersets, parseCsv, readExport, versionOf, type Rules } from '../../scripts/logos-catalogue';

const root = join(__dirname, '../..');
const RULES = JSON.parse(readFileSync(join(root, 'data/logos/catalogue-rules.json'), 'utf8')) as Rules;
const FIXTURE = join(root, 'tests/fixtures/logos-export-head.csv');
/** His whole Logos export: it is his library, so it is not in the repo; the tests that read it are skipped where it is not (set LAMPAS_LOGOS_EXPORT to point at it). */
const VAULT_EXPORT = process.env.LAMPAS_LOGOS_EXPORT ?? '/home/jwhite/millwright-vault/plans/lampas-logos-library-2026-10-08.csv';
/** The five old exports as they were before they became views (tests/fixtures/old-resource-exports.json): the proof that no screen changes. */
const OLD = JSON.parse(readFileSync(join(root, 'tests/fixtures/old-resource-exports.json'), 'utf8')) as {
  LEXICONS: { id: string; resource: string }[];
  GRAMMAR_BOOKS: { id: string; resource: string }[];
  DEFAULT_GRAMMAR_BOOKS: string[];
  WORKS: { id: string; volumes: { resource: string }[] }[];
  COMMON_BIBLES: { id: string }[];
  DEFAULT_LOGOS_BIBLE: string;
  DEVOTIONALS: { id: string }[];
};

const LADDER_IDS = new Set(LADDER.map((i) => i.id));
const BOOK_CODES = new Set(BOOKS.map((b) => b.code));

/** What is wrong with a list of entries, in words: a duplicate Resource ID, an entry with no value, a covers code that is no book, a grammar section idea that is not on the ladder. */
function problemsOf(entries: readonly CatalogueEntry[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const e of entries) {
    if (seen.has(e.resource)) problems.push(`duplicate Resource ID ${e.resource}`);
    seen.add(e.resource);
    if (e.value.trim() === '') problems.push(`${e.resource} has no value`);
    for (const code of e.covers ?? []) if (!BOOK_CODES.has(code)) problems.push(`${e.resource} covers ${code}, which is no book`);
    for (const s of e.sections ?? []) for (const idea of s.ideas) if (!LADDER_IDS.has(idea)) problems.push(`${e.resource} section ${s.title} names ${idea}, which is not on the ladder`);
  }
  return problems;
}

const entry = (over: Partial<CatalogueEntry>): CatalogueEntry => ({
  resource: 'LLS:X', kind: 'lexicon', title: 'X', short: 'X', lang: 'grc', opens: 'word', value: 'a value', via: 'id', ...over,
});

describe('the catalogue rules', () => {
  const named = new Set(RULES.ids.map((r) => r.resource));

  it('names every id of today’s lexicons, grammar books, works, common Bibles and devotionals', () => {
    const wanted = [
      ...OLD.LEXICONS.map((l) => l.resource),
      ...OLD.GRAMMAR_BOOKS.map((g) => g.resource),
      ...OLD.WORKS.flatMap((w) => w.volumes.map((v) => v.resource)),
      ...OLD.COMMON_BIBLES.map((b) => b.id),
      ...OLD.DEVOTIONALS.map((d) => d.id),
    ];
    expect(wanted.length).toBe(21 + 1 + 12 + 9 + 37);
    expect(wanted.filter((r) => !named.has(r))).toEqual([]);
  });

  it('names the grilling’s grammars and Greek texts by id, and the interlinears, English Bibles, calendar devotionals and four commentary series by rule', () => {
    expect(RULES.ids.filter((r) => r.kind === 'grammar').map((r) => r.resource)).toEqual(
      expect.arrayContaining(['LLS:BDF', 'LLS:GGNTLHR', 'LLS:SHGRMRGRKNT', 'LLS:46.20.8', 'LLS:LRNTOREADNTGRK', 'LLS:NTGRKBGNNRSMCHN', 'LLS:KAIROSGRAM', 'LLS:INTROGKGRAMEXREV']),
    );
    expect(RULES.ids.filter((r) => r.kind === 'greek-text').map((r) => r.resource).sort()).toEqual(
      ['LLS:1.0.325', 'LLS:1.0.331', 'LLS:LEXHAMSGNT', 'LLS:LGNTI', 'LLS:NTGBYZ2018', 'LLS:SBLGNT', 'LLS:SBLGNTAPP', 'LLS:SCRMORPH'].sort(),
    );
    expect(RULES.types.map((t) => [t.type, t.kind])).toEqual(
      expect.arrayContaining([['lbx.reverse-interlinear', 'interlinear'], ['text.monograph.bible', 'bible'], ['lbx.calendar-devotional', 'devotional']]),
    );
    expect(RULES.series.map((s) => s.series).sort()).toEqual(
      ['Baker Exegetical Commentary on the New Testament', 'Lenski’s Commentary on the New Testament', 'New International Greek Testament Commentary', 'Pillar New Testament Commentary'].sort(),
    );
  });

  it('names no Resource ID twice, and gives every kind a value line to fall back on', () => {
    const ids = RULES.ids.map((r) => r.resource);
    expect(ids.filter((r, i) => ids.indexOf(r) !== i)).toEqual([]);
    for (const kind of KINDS) expect(RULES.values[kind]?.trim(), kind).toBeTruthy();
  });
});

describe('the generated kinds', () => {
  it('has the seven kinds, each file stamped with the one version', () => {
    expect([...KINDS]).toEqual(['lexicon', 'grammar', 'greek-text', 'interlinear', 'commentary', 'bible', 'devotional']);
    expect(readdirSync(join(root, 'src/resources/catalogue')).sort()).toEqual(KINDS.map((k) => `${k}.json`).sort());
    expect(CATALOGUE_VERSION).toMatch(/^[0-9a-f]{12}$/);
    const files = Object.fromEntries(KINDS.map((kind) => [kind, JSON.parse(readFileSync(join(root, `src/resources/catalogue/${kind}.json`), 'utf8')) as KindFile])) as Record<Kind, KindFile>;
    for (const kind of KINDS) {
      expect(files[kind].kind).toBe(kind);
      expect(files[kind].version).toBe(CATALOGUE_VERSION);
    }
    // the stamp is a hash of what the files hold: an entry edited by hand shows
    expect(versionOf(files)).toBe(CATALOGUE_VERSION);
  });

  it('holds, for every id the rules name, the entry the tool makes from the rules alone; the rows a series or type rule took come from his whole export (below)', () => {
    const { files } = buildCatalogue(RULES, readExport(readFileSync(FIXTURE, 'utf8')));
    for (const kind of KINDS) {
      const committed = JSON.parse(readFileSync(join(root, `src/resources/catalogue/${kind}.json`), 'utf8')) as KindFile;
      const byId = (f: KindFile) => f.entries.filter((e) => e.via === 'id');
      expect(byId(committed), kind).toEqual(byId(files[kind]));
      expect(committed.works ?? null, kind).toEqual(files[kind].works ?? null);
    }
  });

  it('has no duplicate Resource ID, every entry a value, every covers code a book, every grammar section idea a rung of the ladder', () => {
    expect(CATALOGUE.length).toBeGreaterThan(80);
    expect(problemsOf(CATALOGUE)).toEqual([]);
  });

  it('keeps each entry in the file of its kind, with the place Lampas opens it at', () => {
    for (const kind of KINDS) for (const e of entriesOf(kind)) expect(e.kind).toBe(kind);
    expect(new Set(entriesOf('lexicon').map((e) => e.opens))).toEqual(new Set(['word']));
    expect(new Set(entriesOf('devotional').map((e) => e.opens))).toEqual(new Set(['day']));
  });

  it('pins BDAG, Louw-Nida and Black, puts a grammar with no sections table on (never pinned), and starts nothing Off', () => {
    const state = (resource: string) => CATALOGUE.find((e) => e.resource === resource)?.starts;
    expect(state('LLS:46.30.18')).toBe('pinned');
    expect(state('LLS:46.30.4')).toBe('pinned');
    expect(state('LLS:LRNTOREADNTGRK')).toBe('pinned');
    for (const e of entriesOf('grammar')) if (!e.sections) expect(e.starts, e.resource).toBe('on');
    for (const e of CATALOGUE) expect(['on', 'pinned'], e.resource).toContain(e.starts);
  });

  it('fails each kind of fault the test is for', () => {
    expect(problemsOf([entry({}), entry({})])).toEqual(['duplicate Resource ID LLS:X']);
    expect(problemsOf([entry({ value: ' ' })])).toEqual(['LLS:X has no value']);
    expect(problemsOf([entry({ covers: ['mat', 'gen'] })])).toEqual(['LLS:X covers gen, which is no book']);
    expect(problemsOf([entry({ sections: [{ title: 'L1', ref: 'Page.p_1', ideas: ['alphabet', 'no-such-idea'] }] })])).toEqual(['LLS:X section L1 names no-such-idea, which is not on the ladder']);
  });
});

describe('the committed catalogue is written from his whole library, not from the fixture (mw-efwust)', () => {
  const kindEntries = (kind: Kind) => entriesOf(kind);

  it('holds volumes taken by each series rule and by each type rule', () => {
    for (const s of RULES.series) expect(CATALOGUE.filter((e) => e.via === 'series' && e.series === s.series).length, `series ${s.series}`).toBeGreaterThan(0);
    // the devotionals are all named by id, so their type rule adds none; the interlinears and the English Bibles of the New Testament come only by type
    for (const t of RULES.types.filter((x) => x.kind !== 'devotional')) expect(CATALOGUE.filter((e) => e.via === 'type' && e.kind === t.kind).length, `type ${t.type}`).toBeGreaterThan(0);
  });

  it('holds the 24 volumes of the four commentary series, each with the books it covers', () => {
    const bySeries = (name: string) => kindEntries('commentary').filter((e) => e.via === 'series' && e.series === name);
    expect(bySeries('Lenski’s Commentary on the New Testament')).toHaveLength(12);
    expect(bySeries('Baker Exegetical Commentary on the New Testament')).toHaveLength(6);
    expect(bySeries('Pillar New Testament Commentary')).toHaveLength(4);
    expect(bySeries('New International Greek Testament Commentary')).toHaveLength(2);
    for (const e of kindEntries('commentary').filter((x) => x.via === 'series')) expect(e.covers?.length, e.resource).toBeGreaterThan(0);
    expect(kindEntries('commentary')).toHaveLength(36);
  });
});

describe('a rule that matches no row of the export is named (mw-efwust)', () => {
  const row = (over: Partial<Parameters<typeof buildCatalogue>[1][number]>) => ({ resource: 'LLS:NEW', type: 'text.monograph.commentary.bible', abbreviated: '', title: 'A Title', series: '', languages: 'en', supersets: '', ...over });

  it('names a series rule, a type rule and an id rule with no row, and none that has one', () => {
    const rules: Rules = {
      ...RULES,
      works: [],
      ids: [{ resource: 'LLS:HERE', kind: 'lexicon', title: 'Here', short: 'Here' }, { resource: 'LLS:GONE', kind: 'lexicon', title: 'Gone', short: 'Gone' }],
      types: [{ type: 'lbx.reverse-interlinear', kind: 'interlinear', needs: 'nt' }],
      series: [{ series: 'Seen', kind: 'commentary' }, { series: 'Unseen', kind: 'commentary' }],
    };
    const rows = [row({ resource: 'LLS:HERE', type: 'text.monograph.lexicon' }), row({ resource: 'LLS:S1', series: 'Seen', supersets: 'bible.66.1.1-66.16.27' })];
    expect(buildCatalogue(rules, rows).unmatched).toEqual(['id LLS:GONE', 'type lbx.reverse-interlinear', 'series Unseen']);
    expect(buildCatalogue(rules, rows).notes.join('\n')).toMatch(/id LLS:GONE.*type lbx\.reverse-interlinear.*series Unseen|series Unseen/s);
  });

  it('counts a series whose volumes are all on the Old Testament as matching no row', () => {
    const rules: Rules = { ...RULES, works: [], ids: [], types: [], series: [{ series: 'OT only', kind: 'commentary' }] };
    expect(buildCatalogue(rules, [row({ series: 'OT only', supersets: 'bible.1.1.1-1.50.26' })]).unmatched).toEqual(['series OT only']);
  });

  it.skipIf(!existsSync(VAULT_EXPORT))('every series rule and type rule of the rules file matches a row of his whole export (set LAMPAS_LOGOS_EXPORT, or have it in the vault)', () => {
    const { unmatched } = buildCatalogue(RULES, readExport(readFileSync(VAULT_EXPORT, 'utf8')));
    expect(unmatched.filter((u) => !u.startsWith('id '))).toEqual([]);
  });
});

describe('the five old exports as views over the catalogue', () => {
  it('LEXICONS is the catalogue’s lexicons, as it was', () => {
    expect(LEXICONS).toEqual(OLD.LEXICONS);
    expect(entriesOf('lexicon').map((e) => e.resource)).toEqual(OLD.LEXICONS.map((l) => l.resource));
  });

  it('GRAMMAR_BOOKS is the catalogue’s grammars that have a sections table, as it was; the rest are listed for the tutor only', () => {
    expect(GRAMMAR_BOOKS).toEqual(OLD.GRAMMAR_BOOKS);
    expect(DEFAULT_GRAMMAR_BOOKS).toEqual(OLD.DEFAULT_GRAMMAR_BOOKS);
    expect(entriesOf('grammar').filter((e) => e.sections).map((e) => e.resource)).toEqual(OLD.GRAMMAR_BOOKS.map((g) => g.resource));
    expect(entriesOf('grammar').length).toBeGreaterThan(GRAMMAR_BOOKS.length);
  });

  it('WORKS is the catalogue’s work groups and their volumes, as it was', () => {
    expect(WORKS).toEqual(OLD.WORKS);
    expect(WORK_GROUPS.map((g) => g.id)).toEqual(OLD.WORKS.map((w) => w.id));
    for (const w of WORKS) expect(entriesOf('commentary').filter((e) => e.work === w.id).map((e) => e.resource)).toEqual(w.volumes.map((v) => v.resource));
  });

  it('COMMON_BIBLES is the catalogue’s Bibles named by id, and DEFAULT_LOGOS_BIBLE the one it pins, as they were', () => {
    expect(COMMON_BIBLES).toEqual(OLD.COMMON_BIBLES);
    expect(DEFAULT_LOGOS_BIBLE).toBe(OLD.DEFAULT_LOGOS_BIBLE);
    expect(entriesOf('bible').filter((e) => e.starts === 'pinned').map((e) => e.resource)).toEqual([DEFAULT_LOGOS_BIBLE]);
  });

  it('DEVOTIONALS is the catalogue’s devotionals named by id, as it was', () => {
    expect(DEVOTIONALS).toEqual(OLD.DEVOTIONALS);
    expect(entriesOf('devotional').filter((e) => e.via === 'id').map((e) => e.resource)).toEqual(OLD.DEVOTIONALS.map((d) => d.id));
  });
});

describe('the tool', () => {
  const run = (out: string, csv = FIXTURE) => execFileSync(process.execPath, ['--import', 'tsx', join(root, 'scripts/logos-catalogue.ts'), csv, '--out', out], { cwd: root, encoding: 'utf8' });
  const read = (dir: string) => Object.fromEntries(readdirSync(dir).sort().map((f) => [f, readFileSync(join(dir, f), 'utf8')]));

  it('writes the seven kinds from the fixture, and a second run changes nothing', () => {
    const [a, b] = [mkdtempSync(join(tmpdir(), 'cat-a-')), mkdtempSync(join(tmpdir(), 'cat-b-'))];
    run(a);
    run(a);
    run(b);
    expect(Object.keys(read(a))).toEqual(KINDS.map((k) => `${k}.json`).sort());
    expect(read(a)).toEqual(read(b));
  }, 60_000);

  it.skipIf(!existsSync(VAULT_EXPORT))('writes the committed seven kinds from his whole export, and a second run changes nothing (the vault copy, or LAMPAS_LOGOS_EXPORT)', () => {
    const [a, b] = [mkdtempSync(join(tmpdir(), 'cat-c-')), mkdtempSync(join(tmpdir(), 'cat-d-'))];
    run(a, VAULT_EXPORT);
    run(a, VAULT_EXPORT);
    run(b, VAULT_EXPORT);
    expect(read(a)).toEqual(read(b));
    expect(read(a)).toEqual(read(join(root, 'src/resources/catalogue')));
  }, 60_000);

  it('refuses an export with no ResourceId column, and a rule that has no value line', () => {
    expect(() => readExport('Id,Name\r\nA,B\r\n')).toThrow(/ResourceId/);
    const rules: Rules = { ...RULES, values: { ...RULES.values, devotional: '' }, ids: [{ resource: 'LLS:Z', kind: 'devotional', title: 'Z', short: 'Z' }], types: [], series: [] };
    expect(() => buildCatalogue(rules, [])).toThrow(/no value/);
  });
});

describe('the export parser', () => {
  it('reads CRLF, quoted commas and doubled quotes, a quoted newline, and keeps a raw tab in the last cell', () => {
    const text = 'a,b,c\r\n1,"x, y","say ""hi"""\r\n2,"two\r\nlines",z\t\tw\r\n';
    expect(parseCsv(text)).toEqual([['a', 'b', 'c'], ['1', 'x, y', 'say "hi"'], ['2', 'two\r\nlines', 'z\t\tw']]);
  });

  it('reads the fixture’s 60 rows, the quoted comma of Ears from Harvested Sheaves and the tab-separated supersets of The Interpreter', () => {
    const rows = readExport(readFileSync(FIXTURE, 'utf8'));
    expect(rows).toHaveLength(60);
    expect(rows.find((r) => r.resource === 'LLS:20.10.8')?.title).toBe('Ears from Harvested Sheaves, or, Daily Portions');
    expect(rows.find((r) => r.resource === 'LLS:SPURGINTERP')?.supersets.split('\t')).toHaveLength(3);
  });

  it('reads the books a row covers from its ReferenceSupersets, the New Testament only', () => {
    expect(coversOfSupersets('bible.61.1.1-87.22.21')).toEqual(BOOKS.map((b) => b.code));
    expect(coversOfSupersets('bible.75.1.1-77.3.15')).toEqual(['1ti', '2ti', 'tit']);
    expect(coversOfSupersets('bible.72.1.1-72.4.18\tbible.78.1.1-78.1.25')).toEqual(['col', 'phm']);
    expect(coversOfSupersets('bible+esv.61-87')).toHaveLength(27);
    expect(coversOfSupersets('bible.1.1.1-39.4.6\tbible.61.1.1-87.22.21')).toHaveLength(27);
    expect(coversOfSupersets('bible.1.1.1-39.4.6')).toEqual([]);
    expect(coversOfSupersets('dayofyear.1.1-12.31')).toEqual([]);
    expect(coversOfSupersets('')).toEqual([]);
  });
});

describe('the rules at work on rows the fixture does not hold', () => {
  const row = (over: Partial<Parameters<typeof buildCatalogue>[1][number]>) => ({ resource: 'LLS:NEW', type: 'text.monograph.commentary.bible', abbreviated: '', title: 'A Title', series: '', languages: 'en', supersets: '', ...over });
  const kindOf = (kind: Kind, rows: Parameters<typeof buildCatalogue>[1]) => buildCatalogue(RULES, rows).files[kind].entries;

  it('takes every volume of a series rule with its covers, and leaves a volume on the Old Testament out', () => {
    const rows = [
      row({ resource: 'LLS:BEC1', title: 'Romans', series: 'Baker Exegetical Commentary on the New Testament', supersets: 'bible.66.1.1-66.16.27' }),
      row({ resource: 'LLS:BEC2', title: 'Genesis', series: 'Baker Exegetical Commentary on the New Testament', supersets: 'bible.1.1.1-1.50.26' }),
      row({ resource: 'LLS:OTHER', title: 'Elsewhere', series: 'Some Other Series', supersets: 'bible.66.1.1-66.16.27' }),
    ];
    const got = kindOf('commentary', rows).filter((e) => e.via === 'series');
    expect(got.map((e) => [e.resource, e.covers, e.series, e.title])).toEqual([['LLS:BEC1', ['rom'], 'Baker Exegetical Commentary on the New Testament', 'Romans']]);
    expect(got[0].value).toBeTruthy();
  });

  it('takes a reverse interlinear and an English Bible of the New Testament by type, and no other language or Testament', () => {
    const rows = [
      row({ resource: 'RVI:XNT', type: 'lbx.reverse-interlinear', title: 'X NT RI', supersets: 'bible+x.61-87' }),
      row({ resource: 'RVI:XLXX', type: 'lbx.reverse-interlinear', title: 'X LXX RI', supersets: 'bible+lxx.1-39' }),
      row({ resource: 'LLS:XBIBLE', type: 'text.monograph.bible', title: 'The X Bible', languages: 'en', supersets: 'bible+x.1-87' }),
      row({ resource: 'LLS:XOT', type: 'text.monograph.bible', title: 'The X Old Testament', languages: 'en', supersets: 'bible+x.1-39' }),
      row({ resource: 'LLS:XLATIN', type: 'text.monograph.bible', title: 'Biblia X', languages: 'la', supersets: 'bible+x.1-87' }),
    ];
    expect(kindOf('interlinear', rows).map((e) => e.resource)).toEqual(['RVI:XNT']);
    expect(kindOf('bible', rows).filter((e) => e.via === 'type').map((e) => e.resource)).toEqual(['LLS:XBIBLE']);
  });

  it('takes a calendar devotional it does not name, flagged for a day of the year when Logos says so', () => {
    const rows = [row({ resource: 'LLS:DEVNEW', type: 'lbx.calendar-devotional', title: 'A New Devotional', supersets: 'dayofyear.1.1-12.31' })];
    const [e] = kindOf('devotional', rows).filter((d) => d.via === 'type');
    expect([e.resource, e.dayOfYear, e.opens]).toEqual(['LLS:DEVNEW', true, 'day']);
  });

  it('does not take a row twice, and names an id of the rules from the rules alone', () => {
    const rows = [row({ resource: 'LLS:46.30.18', type: 'text.monograph.lexicon', title: 'Other title' })];
    const { files } = buildCatalogue(RULES, rows);
    expect(files.lexicon.entries.find((e) => e.resource === 'LLS:46.30.18')?.title).toBe('BDAG');
    expect(files.lexicon.entries.filter((e) => e.resource === 'LLS:46.30.18')).toHaveLength(1);
  });
});
