// tests/e2e/fixtures/margin-table.ts — the table of docs/audio-player-margin.md from the lines tests/e2e/recorded-voice-margin.spec.ts appends to LAMPAS_MARGIN_OUT
// (mw-ar5k42b.2): for each browser, case and speed, the plays, and the worst and the median error at the start and at the end, in ms of the recording.
// A start error below 0 is sound from before the span; an end error above 0 is sound from after it. Run `node tests/e2e/fixtures/margin-table.ts <file.jsonl>`.
import { readFileSync } from 'node:fs';

interface Line {
  case: string;
  rate: number;
  browser: string;
  startMs: number;
  endMs: number;
  lostMs: number;
  load: string;
}

const lines = readFileSync(process.argv[2], 'utf8')
  .split('\n')
  .filter((l) => l.trim() !== '')
  .map((l) => JSON.parse(l) as Line)
  .filter((l) => typeof l.startMs === 'number');

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

const groups = new Map<string, Line[]>();
for (const l of lines) {
  const key = `${l.browser} | ${l.case} | ${l.rate}x`;
  groups.set(key, [...(groups.get(key) ?? []), l]);
}

console.log('| browser | case | speed | plays | start: earliest (worst) | start: median | start: latest | end: latest (worst) | end: median | end: earliest | own tone lost, most | load (1 min) |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const [key, ls] of groups) {
  const starts = ls.map((l) => l.startMs);
  const ends = ls.map((l) => l.endMs);
  const loads = ls.map((l) => Number(l.load.split(' ')[0])).filter((n) => Number.isFinite(n));
  const load = loads.length ? `${Math.min(...loads).toFixed(1)}-${Math.max(...loads).toFixed(1)}` : '';
  console.log(
    `| ${key.split(' | ').join(' | ')} | ${ls.length} | ${Math.min(...starts)} | ${median(starts)} | ${Math.max(...starts)} | ${Math.max(...ends)} | ${median(ends)} | ${Math.min(...ends)} | ${Math.max(...ls.map((l) => l.lostMs))} | ${load} |`,
  );
}
const all = (f: (l: Line) => number) => lines.map(f);
console.log(`\nworst over all ${lines.length} plays: start ${Math.min(...all((l) => l.startMs))} ms, end ${Math.max(...all((l) => l.endMs))} ms`);
