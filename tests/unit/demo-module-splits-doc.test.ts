// docs/demo-module-splits.md (mw-lwvndc.6): the Governor's phone steps for the epic's Demo, after the Reader and Settings splits.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const doc = readFileSync('docs/demo-module-splits.md', 'utf8');

function section(name: string): string {
  const match = doc.match(new RegExp(`^## ${name}\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'm'));
  expect(match, `a "## ${name}" section`).not.toBeNull();
  return match ? match[1] : '';
}

describe('docs/demo-module-splits.md', () => {
  it.each([
    ['The Reader', ['Romans 8', 'Greek', 'English', 'Verse 3', 'Done', 'Listen', 'Ask the tutor', 'Hold to ask', 'Quiz me', 'Start the quiz', '‹ Reader']],
    ['Settings', ['Settings', 'Search settings', 'Theme', 'Dark', 'Light', 'Phone', 'Text size', 'Largest', 'Normal', '‹ Reader']],
  ])('has numbered steps for %s with its exact labels', (name, labels) => {
    const text = section(name);
    expect(text).toMatch(/^1\. /m);
    expect(text).toMatch(/^2\. /m);
    for (const label of labels) expect(text, `${name}: ${label}`).toContain(label);
  });

  it('says what right looks like and what the Governor says', () => {
    expect(doc).toMatch(/^## Right$/m);
    expect(doc).toContain('Looks good');
  });
});
