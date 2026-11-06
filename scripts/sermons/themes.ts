// scripts/sermons/themes.ts — builds one theme source of the sermon-index repo (sources/<id>/source.toml, topics.jsonl, links.jsonl; docs/sources.md there, 'Theme sources') into Lampas's per-book files
// (public/themes/<id>/<book>.json, src/data/themeIndex.ts; docs/sermons.md 'The themes'). A link is read by parseOsisRef into Lampas's books and numbering and listed under every book it touches; a link the canon
// cannot hold is left out and counted. A topic's `verses` is the verses all its links cover together, in every book, each once, so the sheet's cap needs no second file. Only facts are copied: a topic's name,
// its part labels and the passages; never a sentence of a book.
import { CANON } from '../../src/data/canon';
import { THEME_MAX_VERSES, type ThemeBookFile, type ThemeLinkFile, type ThemePartFile, type ThemeSourceEntry, type ThemeTopicFile } from '../../src/data/themeIndex';
import type { SermonRef } from '../../src/data/sermonIndex';
import { sourceFingerprint } from './fingerprint';
import { parseOsisRef, type VerseCounts } from './osis';

interface TopicRow {
  id: string;
  label: string;
  parts?: Array<{ n: number; label: string }>;
}

interface LinkRow {
  topic: string;
  part?: number;
  ref: string;
}

export interface ThemeReport {
  id: string;
  /** topics in topics.jsonl */
  read: number;
  /** topics with a link listed */
  listed: number;
  /** links in links.jsonl */
  linksRead: number;
  /** links the canon cannot hold: the topic, the reference as written, why */
  omitted: Array<{ topic: string; ref: string; reason: string }>;
  /** the books the canon lacks that links named, with how many links */
  missingBooks: Record<string, number>;
  /** the source's book files, concatenated and gzipped: the size a phone loads */
  gzipBytes: number;
  rawBytes: number;
}

/** A link's reference as a book file writes it: '5.8', '23.1-6', '5.12-6.4'. */
export function linkRef(ref: SermonRef): string {
  const end = ref.toChapter === undefined ? `${ref.to}` : `${ref.toChapter}.${ref.to}`;
  return ref.toChapter === undefined && ref.to === ref.from ? `${ref.chapter}.${ref.from}` : `${ref.chapter}.${ref.from}-${end}`;
}

const lines = (text: string): string[] => text.split('\n').filter((line) => line.trim() !== '');

function json<T>(text: string, file: string, id: string): T[] {
  return lines(text).map((line, i) => {
    try {
      return JSON.parse(line) as T;
    } catch {
      throw new Error(`${id}: ${file}:${i + 1} is not JSON`);
    }
  });
}

/** The verses a part of a link covers, as numbers that compare across chapters of a book: chapter * 1000 + verse. */
function* versesOf(ref: SermonRef, counts: readonly number[]): Generator<number> {
  const last = ref.toChapter ?? ref.chapter;
  for (let chapter = ref.chapter; chapter <= last; chapter++) {
    const from = chapter === ref.chapter ? ref.from : 1;
    const to = chapter === last ? ref.to : counts[chapter - 1];
    for (let verse = from; verse <= to; verse++) yield chapter * 1000 + verse;
  }
}

export interface ThemeBuild {
  files: Map<string, ThemeBookFile>;
  entry: Omit<ThemeSourceEntry, 'name' | 'licence' | 'credit' | 'homepage'>;
  report: ThemeReport;
}

export function buildTheme(id: string, topicsText: string, linksText: string, verses: VerseCounts): ThemeBuild {
  const topics = new Map<string, { row: TopicRow; order: number; verses: Set<string>; books: Set<string> }>();
  for (const [order, row] of json<TopicRow>(topicsText, 'topics.jsonl', id).entries()) topics.set(row.id, { row, order, verses: new Set(), books: new Set() });
  const report: ThemeReport = { id, read: topics.size, listed: 0, linksRead: 0, omitted: [], missingBooks: {}, gzipBytes: 0, rawBytes: 0 };

  const byBook = new Map<string, Array<{ topic: string; part?: number; ref: string }>>();
  const seen = new Set<string>();
  for (const link of json<LinkRow>(linksText, 'links.jsonl', id)) {
    const topic = topics.get(link.topic);
    if (!topic) throw new Error(`${id}: links.jsonl names the topic '${link.topic}', which topics.jsonl lacks`);
    report.linksRead++;
    const parsed = parseOsisRef(link.ref, verses);
    if (!parsed.ok) {
      report.omitted.push({ topic: link.topic, ref: link.ref, reason: parsed.reason });
      if (parsed.book) report.missingBooks[parsed.book] = (report.missingBooks[parsed.book] ?? 0) + 1;
      continue;
    }
    for (const part of parsed.parts) {
      const ref = linkRef(part);
      const key = `${part.book}\n${link.topic}\n${link.part ?? ''}\n${ref}`;
      if (!seen.has(key)) {
        seen.add(key);
        const list = byBook.get(part.book) ?? [];
        // a fixed key order, so the bytes never depend on the order keys were set in
        list.push(link.part === undefined ? { topic: link.topic, ref } : { topic: link.topic, part: link.part, ref });
        byBook.set(part.book, list);
      }
      topic.books.add(part.book);
      for (const v of versesOf(part, verses(part.book) ?? [])) topic.verses.add(`${part.book}:${v}`);
    }
  }

  const files = new Map<string, ThemeBookFile>();
  let linkCount = 0;
  for (const canon of CANON) {
    const links = byBook.get(canon.code);
    if (!links) continue;
    const used = new Map<string, Set<number>>();
    for (const l of links) {
      const set = used.get(l.topic) ?? new Set<number>();
      if (l.part !== undefined) set.add(l.part);
      used.set(l.topic, set);
    }
    const inBook: ThemeTopicFile[] = [...used.keys()]
      .map((topicId) => topics.get(topicId)!)
      .sort((a, b) => a.order - b.order)
      .map((topic) => {
        const wanted = used.get(topic.row.id)!;
        const parts: ThemePartFile[] = (topic.row.parts ?? []).filter((p) => wanted.has(p.n)).map((p) => ({ n: p.n, label: p.label }));
        const out: ThemeTopicFile = { id: topic.row.id, label: topic.row.label, parts, verses: topic.verses.size };
        if (topic.verses.size <= THEME_MAX_VERSES) out.books = CANON.map((c) => c.code).filter((code) => topic.books.has(code));
        return out;
      });
    files.set(canon.code, { topics: inBook, links: links as ThemeLinkFile[] });
    linkCount += links.length;
  }
  report.listed = [...topics.values()].filter((t) => t.verses.size > 0).length;
  return { files, entry: { id, topics: report.listed, links: linkCount, books: [...files.keys()], fingerprint: sourceFingerprint(files) }, report };
}
