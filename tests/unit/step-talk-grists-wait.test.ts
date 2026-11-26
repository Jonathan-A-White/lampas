// A step that waits for the talk request after a tap on Send goes through waitForGrists (tests/support/wait-progress.ts), not a plain waitFor on talkGrists():
// the phone writes the talk, signs and makes its calls one after the other, and one ASYNC_WAIT_MS is outrun on a loaded host (mw-u2w5klk.349.151, mw-u2w5klk.349.164).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const STEPS = join(__dirname, '../../features/steps');

describe('the steps that wait for a talk request', () => {
  it('wait with waitForGrists, never a plain waitFor on talkGrists()', () => {
    const plain: string[] = [];
    for (const name of readdirSync(STEPS).filter((n) => /\.steps\.tsx?$/.test(n))) {
      readFileSync(join(STEPS, name), 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/waitFor\(\s*\(\)\s*=>\s*expect\(talkGrists\(\)\)\.toHaveLength/.test(line)) plain.push(`${name}:${i + 1}`);
        });
    }
    expect(plain, 'plain waitFor on talkGrists(); use waitForGrists(fake, "bible-talk", n)').toEqual([]);
  });
});
