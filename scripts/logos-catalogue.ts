// scripts/logos-catalogue.ts — writes the Logos catalogue (`npm run logos:catalogue -- <csv>`; mw-rfjjzd.2, docs/design/library-at-scale.md 3.1): one file per kind in
// src/resources/catalogue/ from the rules in data/logos/catalogue-rules.json and a Logos library export (Library > Save as Spreadsheet; the vault's
// plans/lampas-logos-library-2026-10-08.csv to start). An id the rules name is written from the rules alone, so the same entry comes out whichever export is read; a type rule or a series
// rule adds every row of the export it takes. Deterministic: the same rules and export give the same bytes, and a second run changes nothing. `--out <dir>` writes elsewhere (the tests do).
// A data tool, not in the gate, like data:build (docs/commands.md).
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BOOKS, NT_BOOKS } from '../src/data/books.ts';
import type { CatalogueEntry, Kind, KindFile, Opens, Via, WorkGroup } from '../src/resources/catalogue.ts';
import type { BookSection, LogosPart, ResourceLang } from '../src/resources/types.ts';
import { ruleOf } from '../src/library/exportRules.ts';
import { coversNewTestament, coversOfSupersets, parseCsv, partsOfSupersets, readExport, type ExportRow } from '../src/library/parseExport.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const RULES_FILE = join(ROOT, 'data/logos/catalogue-rules.json');
export const CATALOGUE_DIR = join(ROOT, 'src/resources/catalogue');

/** The seven kinds, as src/resources/catalogue.ts lists them (repeated here: this tool must not import the files it writes). */
export const KIND_LIST: readonly Kind[] = ['lexicon', 'grammar', 'greek-text', 'interlinear', 'commentary', 'bible', 'devotional'];

// ---- The rules file ----

/** An id the rules name: every field of the entry that the export cannot give, so the entry is the same whichever export is read. `value` falls back to the kind's line in `values`. */
export interface IdRule {
  resource: string;
  kind: Kind;
  title: string;
  short: string;
  id?: string;
  author?: string;
  series?: string;
  lang?: ResourceLang;
  opens?: Opens;
  value?: string;
  covers?: string[];
  /** a Bible: the parts of the canon it holds; a Bible named by id must say, as its export's ranges cannot tell a Bible with the Apocrypha from one without */
  parts?: LogosPart[];
  sections?: BookSection[];
  starts?: 'on' | 'pinned';
  verified?: string;
  key?: CatalogueEntry['key'];
  work?: string;
  source?: string;
  dayOfYear?: boolean;
}

/** Every row of the export of this Logos type joins (`needs: 'nt'`: only if it covers some book of the New Testament; `'bible'`: only if it covers some book of the Bible; `languages`: only if its Languages cell is this). */
export interface TypeRule {
  type: string;
  kind: Kind;
  needs?: 'nt' | 'bible';
  languages?: string;
  lang?: ResourceLang;
  value?: string;
  starts?: 'on' | 'pinned';
}

/** Every commentary volume of the export in this series that covers some book of the New Testament joins, with its `covers` read from its ReferenceSupersets. */
export interface SeriesRule {
  series: string;
  kind: Kind;
  lang?: ResourceLang;
  value?: string;
  starts?: 'on' | 'pinned';
}

export interface Rules {
  /** the value line a rule falls back on, for each kind */
  values: Record<Kind, string>;
  works: WorkGroup[];
  ids: IdRule[];
  types: TypeRule[];
  series: SeriesRule[];
}

// ---- The export ----

// Read by the phone too (src/library/parseExport.ts): the same parser reads an export in both places.
export { coversNewTestament, coversOfSupersets, parseCsv, partsOfSupersets, readExport, type ExportRow };

// ---- The catalogue ----

const DEFAULT_LANG: Record<Kind, ResourceLang> = { lexicon: 'grc', grammar: 'grc', 'greek-text': 'grc', interlinear: 'both', commentary: 'en', bible: 'en', devotional: 'en' };
const DEFAULT_OPENS: Record<Kind, Opens> = { lexicon: 'word', grammar: 'parsing', 'greek-text': 'verse', interlinear: 'verse', commentary: 'verse', bible: 'chapter', devotional: 'day' };

/** The entry with its fields in the one order, and none that is undefined, so the bytes written depend on the data alone. */
function ordered(e: CatalogueEntry): CatalogueEntry {
  const order: (keyof CatalogueEntry)[] = ['resource', 'kind', 'title', 'short', 'author', 'series', 'lang', 'opens', 'value', 'covers', 'parts', 'sections', 'starts', 'verified', 'via', 'id', 'key', 'work', 'source', 'dayOfYear'];
  return Object.fromEntries(order.filter((k) => e[k] !== undefined).map((k) => [k, e[k]])) as unknown as CatalogueEntry;
}

/** The version stamp: a hash of every entry and work of the seven kinds, so a file left behind by an edit shows. */
export function versionOf(files: Record<Kind, Pick<KindFile, 'entries' | 'works'>>): string {
  const body = KIND_LIST.map((k) => ({ kind: k, works: files[k].works ?? null, entries: files[k].entries.map(ordered) }));
  return createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 12);
}

/** The text of one file: its entries one to a line, so a change reads as a diff. */
export function formatKindFile(file: KindFile): string {
  const lines = [`  "kind": ${JSON.stringify(file.kind)}`, `  "version": ${JSON.stringify(file.version)}`];
  if (file.works) lines.push(`  "works": [\n${file.works.map((w) => `    ${JSON.stringify(w)}`).join(',\n')}\n  ]`);
  lines.push(file.entries.length === 0 ? '  "entries": []' : `  "entries": [\n${file.entries.map((e) => `    ${JSON.stringify(ordered(e))}`).join(',\n')}\n  ]`);
  return `{\n${lines.join(',\n')}\n}\n`;
}

export interface Built {
  files: Record<Kind, KindFile>;
  /** what the tool says as it goes: ids the rules name that this export lacks, volumes whose covers differ from the export's */
  notes: string[];
  /** the rules that took no row of this export, by name and in the rules' order: 'id <Resource ID>', 'type <Logos type>', 'series <name>' (a series whose volumes are all on the Old Testament takes none) */
  unmatched: string[];
}

/** The catalogue from the rules and the rows: the ids the rules name, in the rules' order, then the rows a series rule or a type rule takes, by Resource ID. Throws on a rule it cannot write. */
export function buildCatalogue(rules: Rules, rows: readonly ExportRow[]): Built {
  const notes: string[] = [];
  const byKind = Object.fromEntries(KIND_LIST.map((k) => [k, [] as CatalogueEntry[]])) as Record<Kind, CatalogueEntry[]>;
  const taken = new Set<string>();
  const valueOf = (rule: { value?: string; kind: Kind }, what: string): string => {
    const value = (rule.value ?? rules.values[rule.kind] ?? '').trim();
    if (value === '') throw new Error(`${what} has no value: give it one or give ${rule.kind} a line in "values" (an entry with no value is not in the catalogue)`);
    return value;
  };
  const known = new Set(BOOKS.map((b) => b.code));
  const workIds = new Set(rules.works.map((w) => w.id));

  for (const rule of rules.ids) {
    if (!KIND_LIST.includes(rule.kind)) throw new Error(`${rule.resource}: ${rule.kind} is not a kind`);
    if (taken.has(rule.resource)) throw new Error(`${rule.resource} is named twice in the rules`);
    if (rule.kind === 'bible' && !rule.parts?.length) throw new Error(`${rule.resource} is a Bible with no "parts": say which of nt, ot and apocrypha it holds`);
    for (const code of rule.covers ?? []) if (!known.has(code)) throw new Error(`${rule.resource} covers ${code}, which is no book`);
    if (rule.work !== undefined && !workIds.has(rule.work)) throw new Error(`${rule.resource} is a volume of ${rule.work}, which the rules do not list under "works"`);
    taken.add(rule.resource);
    byKind[rule.kind].push({
      resource: rule.resource, kind: rule.kind, title: rule.title, short: rule.short, author: rule.author, series: rule.series,
      lang: rule.lang ?? DEFAULT_LANG[rule.kind],
      opens: rule.opens ?? (rule.kind === 'grammar' && !rule.sections ? 'start' : DEFAULT_OPENS[rule.kind]),
      value: valueOf(rule, rule.resource), covers: rule.covers, parts: rule.parts, sections: rule.sections, starts: rule.starts ?? 'on', verified: rule.verified,
      via: 'id', id: rule.id, key: rule.key, work: rule.work, source: rule.source, dayOfYear: rule.dayOfYear,
    });
  }

  const byResource = new Map(rows.map((r) => [r.resource, r]));
  for (const rule of rules.ids) {
    const row = byResource.get(rule.resource);
    if (!row || !rule.covers) continue;
    const found = coversOfSupersets(row.supersets);
    if (found.join() !== rule.covers.join()) notes.push(`${rule.resource}: the rules cover ${rule.covers.join(' ')} but the export's ReferenceSupersets read ${found.join(' ') || 'nothing'}`);
  }

  for (const rule of rules.ids) {
    const row = byResource.get(rule.resource);
    if (!row || !rule.parts) continue;
    // the export's ranges cannot say the Apocrypha present when they run across it, so the rules may add it; they may not leave out a part the ranges do reach
    const missing = partsOfSupersets(row.supersets).filter((p) => !rule.parts?.includes(p));
    if (missing.length > 0) notes.push(`${rule.resource}: the rules say it holds ${rule.parts.join(' ')} but the export's ReferenceSupersets also reach ${missing.join(' ')}`);
  }

  const add = (row: ExportRow, kind: Kind, via: Via, rule: { value?: string; lang?: ResourceLang; starts?: 'on' | 'pinned' }, what: string): void => {
    // a commentary keeps every book of the Bible it covers (Old Testament too); a Greek book needs only the New Testament's, and none of them when it covers all 27
    const covers = kind === 'commentary' ? coversOfSupersets(row.supersets) : coversNewTestament(row.supersets);
    byKind[kind].push({
      resource: row.resource, kind, title: row.title, short: row.abbreviated || row.title, series: row.series || undefined,
      lang: rule.lang ?? DEFAULT_LANG[kind], opens: DEFAULT_OPENS[kind], value: valueOf({ value: rule.value, kind }, what),
      covers: covers.length > 0 && (covers.length < NT_BOOKS.length || kind === 'commentary') ? covers : undefined,
      parts: kind === 'bible' ? partsOfSupersets(row.supersets) : undefined, starts: rule.starts ?? 'on', via,
      dayOfYear: kind === 'devotional' ? row.supersets.split('\t').some((t) => t.startsWith('dayofyear')) : undefined,
    });
    taken.add(row.resource);
  };
  const sorted = [...rows].sort((a, b) => (a.resource < b.resource ? -1 : a.resource > b.resource ? 1 : 0));
  for (const row of sorted) {
    if (taken.has(row.resource)) continue;
    const found = ruleOf(row, rules);
    if (found?.by === 'series') add(row, found.rule.kind, 'series', found.rule, `series ${found.rule.series}`);
    else if (found?.by === 'type') add(row, found.rule.kind, 'type', found.rule, `type ${found.rule.type}`);
  }

  const used = new Set<unknown>();
  for (const row of sorted) {
    const found = ruleOf(row, rules);
    if (found) used.add(found.rule);
  }
  const unmatched = [
    ...rules.ids.filter((r) => !byResource.has(r.resource)).map((r) => `id ${r.resource}`),
    ...rules.types.filter((r) => !used.has(r)).map((r) => `type ${r.type}`),
    ...rules.series.filter((r) => !used.has(r)).map((r) => `series ${r.series}`),
  ];
  if (unmatched.length > 0) notes.push(`${unmatched.length} of the ${rules.ids.length + rules.types.length + rules.series.length} rules match no row of this export (an id is then written from the rules alone): ${unmatched.join('; ')}`);

  const files = Object.fromEntries(KIND_LIST.map((k) => [k, { kind: k, version: '', entries: byKind[k] }])) as Record<Kind, KindFile>;
  if (rules.works.length > 0) files.commentary.works = rules.works;
  const version = versionOf(files);
  for (const k of KIND_LIST) files[k] = { kind: k, version, ...(files[k].works ? { works: files[k].works } : {}), entries: files[k].entries.map(ordered) };
  return { files, notes, unmatched };
}

export function loadRules(file = RULES_FILE): Rules {
  return JSON.parse(readFileSync(file, 'utf8')) as Rules;
}

/** Writes the seven files into `dir`; returns the notes. */
export function writeCatalogue(csvPath: string, dir = CATALOGUE_DIR, rulesFile = RULES_FILE): string[] {
  const { files, notes } = buildCatalogue(loadRules(rulesFile), readExport(readFileSync(csvPath, 'utf8')));
  mkdirSync(dir, { recursive: true });
  for (const k of KIND_LIST) writeFileSync(join(dir, `${k}.json`), formatKindFile(files[k]));
  return notes;
}

function main(argv: string[]): void {
  const args = argv.slice(2);
  const outAt = args.indexOf('--out');
  const out = outAt >= 0 ? resolve(args[outAt + 1] ?? '') : CATALOGUE_DIR;
  const csv = args.find((a, i) => !a.startsWith('--') && (outAt < 0 || i !== outAt + 1));
  if (!csv) {
    console.error('usage: npm run logos:catalogue -- <export.csv> [--out <dir>]');
    process.exit(2);
  }
  const notes = writeCatalogue(resolve(csv), out);
  for (const n of notes) console.log(`note: ${n}`);
  console.log(`wrote the seven kinds to ${out}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv);
