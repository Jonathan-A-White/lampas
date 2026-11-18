// scripts/lxx/article-gender.ts — npm run lxx:article-gender [-- --dir <folder>] (story mw-u2w5klk.349.34)
// The sweep behind Genesis 24:2: the shipped Septuagint's παιδὶ was N-DSF (the parser's ending rule, learned from feminine nouns in -ις) with the masculine article τῷ before it.
// It reads every shipped chapter (dist/data-lxx or public/data-lxx as lxx:grammar-gaps does, or --dir, e.g. the folder `npm run lxx:ship -- --out <dir>` wrote) and lists each
// article (T-xxx) standing directly before a noun (N-xxx) of another gender, within a verse. It prints `0 articles stand before a noun of another gender` when none does; each
// one found is a line with why (`why`): the noun's case is not the article's (no pair for agreement, not claimed), or the parsing's gender is the New Testament's or a guess (open). Exits 1 while any is open. A mismatch in another case is listed, not claimed.
// Writes nothing. Since mw-u2w5klk.349.34 a settled parser noun whose lemma has another gender in the New Testament takes the article's (agreement.ts `regender`), which cleared παιδί.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SHIPPED_DIRS, readShipped, type ShippedChapter } from './grammar-gaps';

export type { ShippedChapter };

export interface Mismatch {
  /** 'Gen 24:2' */
  ref: string;
  article: string;
  articleParse: string;
  noun: string;
  lemma: string;
  nounParse: string;
  /** the article's place among the verse's Greek words, 0-based */
  index: number;
}

/** Why an article stands before a noun of another gender, and whether that is a fault of the parsing. Every mismatch gets one: the check does not stay silent on any. */
export interface Why {
  kind: 'phrase' | 'name' | 'noun';
  /** false when the pair is no pair for agreement (the noun's case is not the article's); true when the parsing's gender is wrong or only a guess, open for a later story */
  fault: boolean;
  text: string;
}

/** Lemmas whose gender in the Septuagint is known to differ from the New Testament's, with the reason a mismatch is named so. */
export const LEMMA_WHY: Readonly<Record<string, string>> = {
  ἵππος: 'the cavalry, feminine here: Genesis 14 was answered N-ASF by hand (mw-u2w5klk.298), the New Testament has only the masculine',
  παῖς: 'a girl here (Rebekah, the maid), feminine: layer 1 has the New Testament masculine for παῖδα and the model kept it',
};

const caseOf = (morph: string): string | undefined => /^[TN]-([NGDAV])/.exec(morph)?.[1];

/** The reason for one mismatch (`why`): by what the pair is, then by what the parsing is. A noun's own parsing is never changed here; this only names. */
export function why(m: Mismatch): Why {
  if (caseOf(m.articleParse) !== caseOf(m.nounParse)) {
    return { kind: 'phrase', fault: false, text: "the noun's case is not the article's, so no agreement is claimed here (τὸ ἑσπέρας: an article before a genitive of its own phrase); not read word by word" };
  }
  if (m.lemma !== m.lemma.toLowerCase()) {
    return { kind: 'name', fault: true, text: "a name: its gender is the parser's or the model's guess (TBESG gives a name no gender), the article's is the text's; the article's gender is the thing named's" };
  }
  return { kind: 'noun', fault: true, text: LEMMA_WHY[m.lemma] ?? "the noun's gender in the parsing is the New Testament's or the model's, the text's article says another: the parsing is wrong or the noun is a different gender here" };
}

const genderOf = (morph: string): string | undefined => /^[TN]-[NGDAV][SP]([MFN])(?=$|-)/.exec(morph)?.[1];
const bookName = (code: string): string => `${code.charAt(0).toUpperCase()}${code.slice(1)}`;

/** Every article directly before a noun of another gender, in the chapters' order. Only the gender is compared: an article and a noun in other cases still differ in gender when they do. */
export function genderMismatches(chapters: readonly ShippedChapter[]): Mismatch[] {
  const found: Mismatch[] = [];
  for (const chapter of chapters)
    for (const verse of chapter.verses)
      verse.g.forEach((word, i) => {
        const next = verse.g[i + 1];
        if (!next || !word.p.startsWith('T-') || !next.p.startsWith('N-')) return;
        const [a, n] = [genderOf(word.p), genderOf(next.p)];
        if (!a || !n || a === n) return;
        found.push({ ref: `${bookName(chapter.code)} ${chapter.chapter}:${verse.n}`, article: word.t, articleParse: word.p, noun: next.t, lemma: next.l, nounParse: next.p, index: i });
      });
  return found;
}

/** The report: one line for each mismatch with its reason (`why`), then the count, or the one line that says there is none. */
export function mismatchLines(found: readonly Mismatch[]): string[] {
  if (found.length === 0) return ['0 articles stand before a noun of another gender'];
  const lines = found.map((m) => {
    const w = why(m);
    return `${m.ref} #${m.index + 1} ${m.article} ${m.noun} (${m.lemma}): ${m.articleParse} before ${m.nounParse}; ${w.fault ? 'open' : 'no fault'}: ${w.text}`;
  });
  const faults = found.filter((m) => why(m).fault).length;
  return [...lines, `${found.length} articles stand before a noun of another gender: ${found.length - faults} not claimed (another case), ${faults} open`];
}

export function runArticleGender(argv: readonly string[], log: (line: string) => void = () => {}): { found: Mismatch[]; open: number } {
  const dirs = argv.includes('--dir') ? [argv[argv.indexOf('--dir') + 1]] : SHIPPED_DIRS;
  const chapters = dirs.map((dir) => readShipped(dir)).find((c) => c.length > 0);
  if (!chapters) throw new Error(`No shipped Septuagint chapter under ${dirs.join(' or ')}: run \`npm run lxx:ship -- --out dist/data-lxx\` first.`);
  const found = genderMismatches(chapters);
  for (const line of mismatchLines(found)) log(line);
  return { found, open: found.filter((m) => why(m).fault).length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (runArticleGender(process.argv.slice(2), console.log).open > 0) process.exit(1);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
