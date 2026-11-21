// scripts/greek-lines-sweep.ts — npm run greek-lines:sweep [-- --dir public/data] (story mw-5r3p30.1198; src/data/poetry.ts greekLineStarts)
// Runs every New Testament chapter file through withGreekLines and lists each poetry verse that has a line of one word of 4 letters or fewer, or a line whose last word is a preposition, article, negation
// or conjunction (SMALL_WORDS): a small word stranded away from the word it governs. Prints one line per verse with the reason, then the count; exits 1 when the count is not 0. Writes nothing.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Chapter } from '../src/data/chapter';
import { hebrewLinesOf, withGreekLines, smallKey, SMALL_WORDS } from '../src/data/poetry';

const arg = process.argv.indexOf('--dir');
const dir = arg > 0 ? process.argv[arg + 1] : join('public', 'data');
const found: string[] = [];
let verses = 0;
for (const book of readdirSync(dir).sort()) {
  let files: string[];
  try {
    files = readdirSync(join(dir, book)).filter((f) => /^\d+\.json$/.test(f));
  } catch {
    continue;
  }
  for (const file of files.sort((a, b) => parseInt(a) - parseInt(b))) {
    const chapter = JSON.parse(readFileSync(join(dir, book, file), 'utf8')) as Chapter;
    if ((chapter.lang ?? 'grc') !== 'grc' || chapter.edition !== undefined) continue;
    for (const verse of chapter.verses.map(withGreekLines)) {
      const lines = hebrewLinesOf(verse);
      if (!lines) continue;
      verses++;
      const reasons: string[] = [];
      for (const l of lines) {
        const words = verse.g.slice(l.from, l.to).map((w) => w.t);
        if (words.length === 1 && smallKey(words[0]).length <= 4) reasons.push(`one small word «${words[0]}»`);
        else if (SMALL_WORDS.has(smallKey(words.at(-1)!))) reasons.push(`ends on «${words.at(-1)}»`);
      }
      if (reasons.length) found.push(`${book} ${chapter.chapter}:${verse.n}  ${reasons.join('; ')}`);
    }
  }
}
for (const line of found) console.log(line);
console.log(`${found.length} verses with a stranded small word, of ${verses} New Testament poetry verses with Greek lines`);
process.exitCode = found.length === 0 ? 0 : 1;
