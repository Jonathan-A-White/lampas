// tests/e2e/fixtures/margin-table.ts — the table of docs/audio-player-margin.md from the lines tests/e2e/recorded-voice-margin.spec.ts appends to LAMPAS_MARGIN_OUT
// (mw-ar5k42b.2): for each browser, case and speed, the plays, and the worst and the median error at the start and at the end, in ms of the recording.
// A start error below 0 is sound from before the span; an end error above 0 is sound from after it. Run `node tests/e2e/fixtures/margin-table.ts <file.jsonl>`.
import { readFileSync } from 'node:fs';

// The own-tone limit of the spec (recorded-voice-margin.spec.ts hold(): lostMs): an end heard earlier than the span's end less the margin's tail and the fade loses
// the span's own tone and fails the play. NEAR_MS is how close to it a play is counted as having come near (mw-ar5k42b.47: under load the earliest end was -90 ms, 20 ms short).
const FADE_MS = 60; // src/speech/recordedVoice.ts FADE (tests/unit/margin-table.test.ts pins it)
const MARGIN = JSON.parse(readFileSync(new URL('../../../scripts/audio-timings/player-margin.json', import.meta.url), 'utf8')) as { tail: number; inside: { lead: number } };
const LIMIT_MS = -(Math.round(MARGIN.tail * 1000) + FADE_MS);
const NEAR_MS = 20;
// The latest a start may be heard after its span's start (player-margin.json inside.lead; the spec holds it, mw-ar5k42b.59: 43 and 46 ms were seen against 25).
const LATE_MS = Math.round(MARGIN.inside.lead * 1000);

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

console.log(`| browser | case | speed | plays | start: earliest (worst) | start: median | start: latest | start: plays past inside.lead | end: latest (worst) | end: median | end: earliest | end: room to the limit | plays within ${NEAR_MS} ms of the limit | plays past the limit | own tone lost, most | load (1 min) |`);
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const [key, ls] of groups) {
  const starts = ls.map((l) => l.startMs);
  const ends = ls.map((l) => l.endMs);
  const loads = ls.map((l) => Number(l.load.split(' ')[0])).filter((n) => Number.isFinite(n));
  const load = loads.length ? `${Math.min(...loads).toFixed(1)}-${Math.max(...loads).toFixed(1)}` : '';
  console.log(
    `| ${key.split(' | ').join(' | ')} | ${ls.length} | ${Math.min(...starts)} | ${median(starts)} | ${Math.max(...starts)} | ${starts.filter((x) => x > LATE_MS).length} | ${Math.max(...ends)} | ${median(ends)} | ${Math.min(...ends)} | ${Math.min(...ends) - LIMIT_MS} | ${ends.filter((e) => e >= LIMIT_MS && e <= LIMIT_MS + NEAR_MS).length} | ${ends.filter((e) => e < LIMIT_MS).length} | ${Math.max(...ls.map((l) => l.lostMs))} | ${load} |`,
  );
}
const all = (f: (l: Line) => number) => lines.map(f);
console.log(`\nworst over all ${lines.length} plays: start ${Math.min(...all((l) => l.startMs))} ms, end ${Math.max(...all((l) => l.endMs))} ms`);
const past = lines.filter((l) => l.endMs < LIMIT_MS).length;
const near = lines.filter((l) => l.endMs >= LIMIT_MS && l.endMs <= LIMIT_MS + NEAR_MS).length;
console.log(`own-tone limit ${LIMIT_MS} ms: ${near} plays within ${NEAR_MS} ms of it, ${past} past it`);
const late = lines.filter((l) => l.startMs > LATE_MS).length;
console.log(`start limit ${LATE_MS} ms: ${late} plays started later`);
if (late > 0) {
  console.error(`${late} of ${lines.length} plays started later than ${LATE_MS} ms`);
  process.exitCode = 1;
}
if (past > 0) {
  console.error(`${past} of ${lines.length} plays ended earlier than ${LIMIT_MS} ms`);
  process.exitCode = 1;
}
