// scripts/drill-build.ts — npm run drill:build (mw-5r3p30.1000, docs/data.md 'Drill answers'). Sets the drill answer (`q`) of every lemma of public/data/lexicon.json from the
// Greek-English alignment in the committed chapters and writes data/drill-report.json: the last step of `npm run data:build` on the data as it stands, for when only the
// answers change (the corrections, the line) and the text does not. TBESG (data/raw/tbesg.txt, fetched when absent) gives the other meanings of a number. A second run changes nothing.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normaliseLemma } from '../src/data/lemma';
import { SEED_WORDS } from '../src/data/seed-words';
import type { Chapter, BookIndex } from '../src/data/chapter';
import type { LemmaLexicon } from '../src/data/lexicon';
import { DRILL_REPORT_FILE, TBESG_URL, drillReportText } from './data-build';
import { drillAnswers } from './data/drillAnswers';
import { CORRECTIONS } from './data/drill-corrections';
import { fetchTo, writeIfChanged } from './data/chapterWriter';
import { parseTbes } from './data/tbes';
import { withAoristNote } from '../src/data/irregular-aorists';

const DATA = 'public/data';
const TBESG = 'data/raw/tbesg.txt';

async function main(): Promise<void> {
  if (!existsSync(TBESG)) await fetchTo(TBESG_URL, TBESG);
  const lex = parseTbes(readFileSync(TBESG, 'utf8'), { letter: 'G', gloss: withAoristNote });
  const read = <T>(path: string): T => JSON.parse(readFileSync(join(DATA, path), 'utf8')) as T;
  const lexicon = read<LemmaLexicon>('lexicon.json');
  const index = read<BookIndex>('index.json');
  const chapters = index.books.filter((b) => (b.lang ?? 'grc') === 'grc').flatMap((b) => Array.from({ length: b.chapters }, (_, i) => read<Chapter>(`${b.code}/${i + 1}.json`)));
  const seeds = new Map(SEED_WORDS.map((w) => [normaliseLemma(w.lemma).headword.normalize('NFC'), w.gloss] as const));
  const drill = drillAnswers({ chapters, lexicon, senses: lex.senses, seeds, corrections: CORRECTIONS });
  for (const [lemma, r] of Object.entries(drill.lemmas)) {
    delete lexicon[lemma].q;
    if (r.answer !== lexicon[lemma].g) lexicon[lemma].q = r.answer;
  }
  const changed = [writeIfChanged(join(DATA, 'lexicon.json'), JSON.stringify(lexicon)), writeIfChanged(DRILL_REPORT_FILE, drillReportText(drill))];
  const sources = Object.values(drill.lemmas).reduce<Record<string, number>>((n, r) => ({ ...n, [r.source]: (n[r.source] ?? 0) + 1 }), {});
  console.log(`drill answers: ${JSON.stringify(sources)}; ${Object.values(lexicon).filter((e) => e.q !== undefined).length} answers differ from the gloss; ${changed.filter(Boolean).length} files written`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
