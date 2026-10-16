// npm run audible:build — reads The Word of Promise's chapter list from Audible's public catalogue once (no login, network) and writes
// src/resources/audibleStarts.json: where each chapter starts, in milliseconds, keyed by Lampas's book code and chapter ('luk.15').
// audible-kit does the reading (fetchChapterStarts) and the mapping of Audible's own titles ('Psalm 23', 'Revelations 22', 'The Book of
// Obadiah') to the Bible's book and chapter (wordOfPromiseChapters); this script keys the result the way Lampas does and checks that the
// label the Verse view shows (audibleChapterLabel) is a title Audible really has for every chapter. A second run changes nothing unless
// Audible changed its catalogue. (mw-5r3p30.451, docs/resources.md 'Audio Bible: Listen in Audible')
import { writeFileSync } from 'node:fs';
import { WORD_OF_PROMISE_ASIN, fetchChapterStarts, wordOfPromiseChapters } from 'audible-kit';
import { BOOKS } from '../src/data/books';
import { OT_BOOKS } from '../src/data/otBooks';
import { audibleChapterLabel } from '../src/resources/audioBible';

const SOURCE = `https://api.audible.com/1.0/content/${WORD_OF_PROMISE_ASIN}/metadata?response_groups=chapter_info`;

const starts = await fetchChapterStarts(WORD_OF_PROMISE_ASIN);
const byName = wordOfPromiseChapters(starts);
const titles = new Set(starts.map((s) => s.title.replace(/\s+/g, ' ').trim()));

const chapters: Record<string, number> = {};
const problems: string[] = [];
for (const book of [...OT_BOOKS, ...BOOKS]) {
  for (let chapter = 1; chapter <= book.chapters; chapter++) {
    const start = byName[`${book.name} ${chapter}`];
    if (start === undefined) problems.push(`no start for ${book.name} ${chapter}`);
    else chapters[`${book.code}.${chapter}`] = start;
    const label = audibleChapterLabel(book.code, chapter);
    if (label === undefined || !titles.has(label)) problems.push(`Audible has no chapter titled ${JSON.stringify(label)} (${book.name} ${chapter})`);
  }
}
if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}

const out = { asin: WORD_OF_PROMISE_ASIN, source: SOURCE, chapters };
writeFileSync(new URL('../src/resources/audibleStarts.json', import.meta.url), `${JSON.stringify(out, null, 1)}\n`);
console.log(`wrote ${Object.keys(chapters).length} chapters`);
