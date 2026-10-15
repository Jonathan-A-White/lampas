// tests/unit/published-wait.test.ts — a step that checks what an event list heard waits for it (mw-5r3p30.389).
// teachIdea writes the level, publishes grammar-level-changed, awaits announceAlphabet and only then publishes idea-taught, so a step that
// waits for the level and then asserts the list at once sees [] on a loaded host. tests/support/published.ts is the one wait they share.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { expectPublished } from '../support/published';

describe('expectPublished', () => {
  it('waits for an event that is published after the step asks, as idea-taught is after its level', async () => {
    const heard: Array<{ kind: string; id: string }> = [];
    setTimeout(() => heard.push({ kind: 'idea-taught', id: 'noun' }), 1500);
    await expectPublished(() => heard, [{ kind: 'idea-taught', id: 'noun' }]);
  });

  it('follows a list the scenario starts over, because it is asked for the list each time', async () => {
    let heard: string[] = ['stale'];
    setTimeout(() => (heard = ['fresh']), 200);
    await expectPublished(() => heard, ['fresh']);
  });

  it('refuses a list that never matches, and says what it held', async () => {
    await expect(expectPublished(() => [] as string[], ['x'], 300)).rejects.toThrow(/x/);
  });
});

function stepFiles(): string[] {
  return readdirSync('features/steps')
    .filter((name) => /\.steps\.tsx?$/.test(name))
    .map((name) => join('features/steps', name));
}

describe('the step files', () => {
  it('never assert a list of published events at once: they go through expectPublished', () => {
    const offences: string[] = [];
    for (const file of stepFiles()) {
      const source = readFileSync(file, 'utf8');
      // the lists a step file fills from the bus: `let taught: EventOf<'idea-taught'>[]`, `let heard: AppEvent[]`
      const lists = [...source.matchAll(/^let (\w+)\s*:\s*(?:EventOf<[^>]+>|AppEvent)\[\]/gm)].map((m) => m[1]);
      const rows = source.split('\n');
      // a line is waited on when a waitFor opens on it or on one of the few lines above it (a block body)
      const waited = (i: number) => rows.slice(Math.max(0, i - 6), i + 1).some((row) => /waitFor/.test(row));
      rows.forEach((line, i) => {
        for (const name of lists) {
          if (new RegExp(`expect\\(${name}\\b`).test(line) && !waited(i)) offences.push(`${file}:${i + 1} asserts ${name} at once`);
        }
        // the newest event the bus kept: `expect(latest('x'))` / `expect(lastOf('x'))` is asked at once; expectLatest waits
        if (/expect\((latest|lastOf)\(/.test(line) && !waited(i)) offences.push(`${file}:${i + 1} reads the newest event at once`);
      });
    }
    expect(offences).toEqual([]);
  });
});
