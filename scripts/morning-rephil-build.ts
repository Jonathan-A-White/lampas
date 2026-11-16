// scripts/morning-rephil-build.ts — bundles Brookfield First's Morning RePhil episode list (sermon-index's data/morning-rephil.jsonl, written by that repo's tools) into
// data/daily/morning-rephil.json, which src/data/daily/morningRephil.ts imports (mw-qtu3zvz.15). Not in the gate: run it by hand when the list has new episodes.
//   npx tsx scripts/morning-rephil-build.ts ~/sermon-index/data/morning-rephil.jsonl
// Kept per episode: id (the share link's code), number (only when the title prints one), title, date and the Subsplash share link. The YouTube watch link of a row is
// dropped on purpose: no YouTube data is kept in Lampas. Oldest first (by date, then number).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

interface Row {
  number?: number;
  title: string;
  date: string;
  share?: string;
}

const SHARE = /^https:\/\/brookfieldfirst\.subspla\.sh\/([A-Za-z0-9]+)$/;

export function bundle(jsonl: string): { id: string; number: number | null; title: string; date: string; share: string }[] {
  const out = jsonl
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as Row)
    .flatMap((row) => {
      const code = SHARE.exec(row.share ?? '')?.[1];
      if (!code || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) return [];
      // a number the title does not print is the list's own count of its place, not the church's: left out
      const printed = /#(\d+)/.exec(row.title)?.[1];
      return [{ id: code, number: printed ? Number(printed) : null, title: row.title, date: row.date, share: row.share as string }];
    });
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.number ?? 0) - (b.number ?? 0));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const from = process.argv[2];
  if (!from) throw new Error('usage: npx tsx scripts/morning-rephil-build.ts <path to sermon-index data/morning-rephil.jsonl>');
  const episodes = bundle(readFileSync(from, 'utf8'));
  writeFileSync(new URL('../data/daily/morning-rephil.json', import.meta.url), `${JSON.stringify(episodes, null, 1)}\n`);
  console.log(`${episodes.length} episodes, ${episodes[0].date} to ${episodes[episodes.length - 1].date}`);
}
