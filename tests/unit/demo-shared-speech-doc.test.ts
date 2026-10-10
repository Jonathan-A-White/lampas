// docs/demo-shared-speech.md (mw-m7v5kc.5): the Governor's phone steps for the shared read-aloud bar in Postern, Lampas and SpellForge.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const doc = readFileSync('docs/demo-shared-speech.md', 'utf8');

function section(name: string): string {
  const match = doc.match(new RegExp(`^## ${name}\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'm'));
  expect(match, `a "## ${name}" section`).not.toBeNull();
  return match ? match[1] : '';
}

describe('docs/demo-shared-speech.md', () => {
  it.each([
    ['Postern', ['Talk to the Mayor', 'Pause', 'Channels', 'Resume', 'Restart', 'Stop']],
    ['Lampas', ['Read from the top', 'Settings', '‹ Reader', 'Pause', 'Resume', 'Restart', 'Stop']],
    ['SpellForge', ['Say it again', 'Pause', 'Resume', 'Restart', 'Stop']],
  ])('has numbered steps for %s with its exact labels', (app, labels) => {
    const text = section(app);
    expect(text).toMatch(/^1\. /m);
    expect(text).toMatch(/^2\. /m);
    for (const label of labels) expect(text, `${app}: ${label}`).toContain(label);
  });

  it('ends with what the Governor says', () => {
    expect(doc).toContain('Looks good');
  });
});
