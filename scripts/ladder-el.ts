// scripts/ladder-el.ts — the Greek reading ladder (mw-neuq78.1, docs/reading-ladder.md): scores every verse of public/data for how hard it
// is to PRONOUNCE (not to understand) and writes public/data/ladder/el.json, easiest first. Run by `npm run ladder`, never at runtime.
// Deterministic: the same data gives the same bytes. The weights are a first guess.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { scoreWords, WEIGHTS } from '../src/data/ladderScore';
import { buildLadderWith, type LadderEntry } from './ladder-shared';

export type { LadderEntry };
export { scoreWords, WEIGHTS };

/** Scores every verse under `dataDir` and writes the ladder to `outFile`: easiest first, a tie by canonical order. */
export function buildLadder(dataDir: string, outFile: string): LadderEntry[] {
  return buildLadderWith(dataDir, outFile, (verse) => scoreWords(verse.g.map((w) => w.t)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const ladder = buildLadder('public/data', 'public/data/ladder/el.json');
  console.log(`${ladder.length} verses, easiest ${ladder[0].ref} (${ladder[0].score}), hardest ${ladder[ladder.length - 1].ref} (${ladder[ladder.length - 1].score})`);
}
