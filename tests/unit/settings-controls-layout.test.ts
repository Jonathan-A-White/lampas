import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SETTINGS_SOURCE } from '../support/settings-sources';

const DIR = SETTINGS_SOURCE.controlsDir;
const FILES = [
  'types.ts',
  'index.ts',
  'SettingRow.tsx',
  'appearance.tsx',
  'weave.tsx',
  'newWords.tsx',
  'goal.tsx',
  'approach.tsx',
  'voice.tsx',
  'resources.tsx',
  'tutor.tsx',
  'developer.tsx',
  'quizGoal.tsx',
];

describe('the Settings controls (docs/module-map.md R3)', () => {
  it.each(FILES)('%s is in the settings controls directory', (file) => {
    expect(existsSync(`${DIR}/${file}`)).toBe(true);
  });

  it('SettingsScreen.tsx is under 200 lines and defines no control', () => {
    const text = readFileSync('src/SettingsScreen.tsx', 'utf8');
    expect(text.split('\n').length).toBeLessThan(200);
    expect(text).not.toMatch(/const \w+Control\b|function \w+(Control|Picker|Choice)\b/);
  });
});
