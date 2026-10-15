// mw-skwocd.9: the Bible talk's steps are split by the feature's rules, one file per group of scenarios under features/steps/bible-talk/.
// Every scenario of features/bible-talk.feature carries exactly one group tag (a tag no file runs would leave its scenario unrun and
// unnoticed), every group has a steps file that runs just its tag, and no file of the folder is over 400 lines.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const DIR = 'features/steps/bible-talk';
const GROUPS = ['sheet', 'grist', 'settings', 'words', 'answer'];
const files = (): string[] => (existsSync(DIR) ? readdirSync(DIR).sort() : []);

describe('the Bible talk steps are split by the feature', () => {
  it('is no longer one steps file next to the folder', () => {
    expect(existsSync('features/steps/bible-talk.steps.tsx')).toBe(false);
  });

  it('has a steps file for each group, running only its tag', () => {
    for (const group of GROUPS) {
      const path = `${DIR}/${group}.steps.tsx`;
      expect(existsSync(path), `${path} is missing`).toBe(true);
      expect(readFileSync(path, 'utf8')).toContain(`includeTags: ['${group}']`);
    }
  });

  it('has no file over 400 lines', () => {
    for (const name of files()) {
      const lines = readFileSync(`${DIR}/${name}`, 'utf8').split('\n').length - 1;
      expect(lines, `${DIR}/${name} has ${lines} lines`).toBeLessThanOrEqual(400);
    }
  });

  it('tags every scenario of the feature with exactly one group', () => {
    const lines = readFileSync('features/bible-talk.feature', 'utf8').split('\n');
    const untagged: string[] = [];
    lines.forEach((line, i) => {
      if (!/^\s*Scenario:/.test(line)) return;
      const tags = (lines[i - 1] ?? '').trim().split(/\s+/).filter((t) => t.startsWith('@')).map((t) => t.slice(1));
      const groups = tags.filter((t) => GROUPS.includes(t));
      if (groups.length !== 1 || groups.length !== tags.length) untagged.push(`${i + 1}: ${line.trim()} (tags: ${tags.join(' ') || 'none'})`);
    });
    expect(untagged, `scenarios without exactly one group tag:\n${untagged.join('\n')}`).toEqual([]);
  });
});
