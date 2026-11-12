// settingsBlock() (src/settings/grindText.ts): each setting's line closes the help or hint with a full stop before its Value, and the
// Greek keyboard line says when it is On (mw-82lb97i.21).
import { describe, expect, it } from 'vitest';
import { settingsBlock } from '../../src/settings/grindText';

const lines = (): string[] => settingsBlock().split('\n').filter((l) => l.startsWith('- `'));

describe('the settings the bible-talk instructions list', () => {
  it('ends the help or hint with a full stop, question mark or exclamation mark before every Value', () => {
    const bad = lines().filter((l) => /[^.?!] Value:/.test(l));
    expect(bad, `lines that run into their Value: ${bad.join('\n')}`).toEqual([]);
  });

  it('says on the Greek and Hebrew keyboard line when it is On', () => {
    const line = lines().find((l) => l.startsWith('- `greekKeyboard`'));
    expect(line).toContain('On once you have added a keyboard of that language to your phone');
  });
});
