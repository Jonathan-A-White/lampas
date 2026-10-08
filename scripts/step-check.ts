// scripts/step-check.ts — asks STEPBible, one by one, what the Study chip's link for a word finds. Not part of the gate (it uses the network).
//   npm run check:step                  G1722, G3361, G2424 and the 20 most frequent lemmas of Romans 8
//   npm run check:step -- G25 G2962     those Strong's numbers
//   npm run check:step -- --all         every Strong's number the text uses (about 5,400 requests)
// STEP's REST search is what its page runs: https://www.stepbible.org/rest/search/masterSearch/strong=<number>.
// It answers a browser's User-Agent only (Cloudflare turns curl away). Exit code 1 when any link finds neither verses nor a lexicon entry.
import { readFileSync } from 'node:fs';
import { stepNumber, strongsUrl } from '../src/resources/strongs';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const read = <T>(path: string): T => JSON.parse(readFileSync(new URL(`../public/data/${path}`, import.meta.url), 'utf8')) as T;

interface Lexicon { [lemma: string]: { s: string; g: string } }
interface Chapter { verses: { g: { s: string; l: string }[] }[] }

async function verses(number: string): Promise<number> {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(`https://www.stepbible.org/rest/search/masterSearch/strong=${number}`, { headers: { 'User-Agent': UA } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return ((await response.json()) as { total: number }).total;
    } catch (error) {
      if (attempt === 4) throw error;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

/** A number STEP lists no verses for links to Blue Letter Bible's lexicon entry; its page title must name the number. */
async function entry(url: string, strongs: string): Promise<boolean> {
  const response = await fetch(url, { headers: { 'User-Agent': UA } });
  const title = /<title>([^<]*)/.exec(await response.text())?.[1] ?? '';
  return response.ok && title.startsWith(`${strongs} -`);
}

const lexicon = read<Lexicon>('lexicon.json');
const lemmaOf = new Map(Object.entries(lexicon).map(([lemma, v]) => [v.s, lemma]));
const args = process.argv.slice(2);
let numbers: string[];
if (args.includes('--all')) numbers = [...lemmaOf.keys()];
else if (args.length > 0) numbers = args;
else {
  const counts = new Map<string, number>();
  for (const verse of read<Chapter>('rom/8.json').verses) for (const w of verse.g) counts.set(w.s, (counts.get(w.s) ?? 0) + 1);
  const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([s]) => s);
  numbers = [...new Set([...top, 'G1722', 'G3361', 'G2424'])];
}

let bad = 0;
let next = 0;
const rows: string[] = new Array(numbers.length);
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (next < numbers.length) {
      const i = next++;
      const strongs = numbers[i];
      const url = strongsUrl(strongs);
      if (!url) {
        rows[i] = `none ${strongs.padEnd(6)} ${(lemmaOf.get(strongs) ?? '').padEnd(14)} no link: neither STEP nor Strong's own list has it`;
        continue;
      }
      const name = `${strongs.padEnd(6)} ${(lemmaOf.get(strongs) ?? '').padEnd(14)}`;
      if (url.includes('stepbible.org')) {
        const number = stepNumber(strongs);
        const total = await verses(number);
        if (total === 0) bad++;
        rows[i] = `${total > 0 ? 'ok  ' : 'NONE'} ${name} STEP strong=${number.padEnd(7)} ${total} verses`;
      } else {
        const found = await entry(url, strongs);
        if (!found) bad++;
        rows[i] = `${found ? 'ok  ' : 'NONE'} ${name} lexicon entry ${url}`;
      }
    }
  }),
);
console.log(rows.join('\n'));
const unlinked = rows.filter((r) => r.startsWith('none')).length;
console.log(`${numbers.length - bad - unlinked} of ${numbers.length} links find verses or an entry, ${unlinked} have no link`);
process.exit(bad > 0 ? 1 : 0);
