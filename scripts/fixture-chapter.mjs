// scripts/fixture-chapter.mjs — copies a built chapter, byte for byte, from public/data/<book>/<n>.json to tests/fixtures/data/<book>/<n>.json, where a test that needs a real
// chapter reads it (tests/support/chapter-fetch.ts serves the fixture before the built file). A fixture is a copy, never retyped: node scripts/fixture-chapter.mjs jon 1
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';

const [book, chapter] = process.argv.slice(2);
if (!/^[0-9a-z]{3}$/.test(book ?? '') || !/^[1-9]\d{0,2}$/.test(chapter ?? '')) {
  console.error('usage: node scripts/fixture-chapter.mjs <book code> <chapter>   (e.g. jon 1)');
  process.exit(1);
}
const from = `public/data/${book}/${chapter}.json`;
if (!existsSync(from)) {
  console.error(`${from} is not built (npm run data:build / data:build:ot)`);
  process.exit(1);
}
mkdirSync(`tests/fixtures/data/${book}`, { recursive: true });
copyFileSync(from, `tests/fixtures/data/${book}/${chapter}.json`);
console.log(`tests/fixtures/data/${book}/${chapter}.json copied from ${from}`);
