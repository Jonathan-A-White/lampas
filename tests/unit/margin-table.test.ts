// tests/e2e/fixtures/margin-table.ts says how near a play came to the margin spec's own-tone limit (mw-ar5k42b.47): a play whose end is heard earlier than
// -(tail + FADE) ms of its span's end fails the spec's lostMs check, and the table used to give only the earliest end, so nothing said how often a play came near it.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { FADE } from '../../src/speech/recordedVoice';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

const SCRIPT = resolve(__dirname, '../../tests/e2e/fixtures/margin-table.ts');
const MARGIN = JSON.parse(readFileSync(resolve(__dirname, '../../scripts/audio-timings/player-margin.json'), 'utf8')) as { lead: number; tail: number; inside: { lead: number } };
const LIMIT = -Math.round((MARGIN.tail + FADE) * 1000);

const dirs: string[] = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

const play = (endMs: number, kase = 'one verse alone', rate = 1, startMs = 10) => ({
  case: kase, rate, browser: 'chromium', startMs, endMs, lostMs: 0, load: '16.00 12.00 8.00',
});

function table(lines: object[]) {
  const dir = mkdtempSync(join(tmpdir(), 'margin-table-'));
  dirs.push(dir);
  const file = join(dir, 'margin.jsonl');
  writeFileSync(file, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
  const r = spawnSync('node', [SCRIPT, file], { encoding: 'utf8', timeout: 30_000 });
  return { out: r.stdout, err: r.stderr, status: r.status };
}

describe('margin-table: how near the own-tone limit the ends came', () => {
  it('uses the limit the spec holds: the margin tail plus the fade, -110 ms', () => {
    expect(LIMIT).toBe(-110);
  });

  it('gives each row its room to the limit and the plays within 20 ms of it', () => {
    const { out, status } = table([play(-60), play(-70), play(-95), play(-90), play(-80, 'a section', 1.25)]);
    expect(status).toBe(0);
    const rows = out.split('\n').filter((l) => l.startsWith('| chromium'));
    const cells = (row: string) => row.split('|').map((c) => c.trim());
    const head = cells(out.split('\n').find((l) => l.startsWith('| browser'))!);
    const room = head.indexOf('end: room to the limit');
    const near = head.indexOf('plays within 20 ms of the limit');
    const past = head.indexOf('plays past the limit');
    expect(room).toBeGreaterThan(0);
    expect(near).toBeGreaterThan(0);
    expect(past).toBeGreaterThan(0);
    const alone = cells(rows.find((r) => r.includes('one verse alone'))!);
    expect(alone[room]).toBe('15'); // earliest -95 against -110
    expect(alone[near]).toBe('2'); // -95 and -90 are within 20 ms of -110
    expect(alone[past]).toBe('0');
    const section = cells(rows.find((r) => r.includes('a section'))!);
    expect(section[near]).toBe('0');
  });

  it('counts a play past the limit and exits non-zero naming how many', () => {
    const { out, err, status } = table([play(-60), play(-125), play(-111)]);
    expect(status).not.toBe(0);
    expect(out + err).toMatch(/2 of 3 plays ended earlier than -110 ms/);
  });
});

// mw-ar5k42b.59: the 360-play run had starts heard 43 and 46 ms after the span's start at 1.25x while player-margin.json said the start is lost up to inside.lead, 25 ms, and
// nothing held a play to it (the spec asks the own tone from start + lead). The number and the table now agree: inside.lead is what the spec holds, and a play past it is counted.
describe('margin-table: how late the starts came', () => {
  const INSIDE_MS = Math.round(MARGIN.inside.lead * 1000);

  it('holds inside.lead to the margin the spec asks the own tone from: a start later than lead loses own tone', () => {
    expect(INSIDE_MS).toBe(Math.round(MARGIN.lead * 1000));
  });

  it('gives each row the plays whose start was heard later than inside.lead, and exits non-zero naming how many', () => {
    const { out, err, status } = table([play(-60, 'one verse alone', 1.25, INSIDE_MS - 4), play(-60, 'one verse alone', 1.25, INSIDE_MS + 1), play(-60, 'a section', 1, 20)]);
    expect(status).not.toBe(0);
    expect(out + err).toMatch(new RegExp(`1 of 3 plays started later than ${INSIDE_MS} ms`));
    const cells = (row: string) => row.split('|').map((c) => c.trim());
    const head = cells(out.split('\n').find((l) => l.startsWith('| browser'))!);
    const late = head.indexOf('start: plays past inside.lead');
    expect(late).toBeGreaterThan(0);
    const alone = cells(out.split('\n').find((l) => l.startsWith('| chromium') && l.includes('one verse alone'))!);
    expect(alone[late]).toBe('1');
  });

  it('passes a table whose latest start is inside.lead', () => {
    const { status } = table([play(-60, 'one verse alone', 1.25, INSIDE_MS), play(-60, 'a section', 1, 20)]);
    expect(status).toBe(0);
  });
});
