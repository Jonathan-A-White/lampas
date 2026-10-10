// docs/demo-shared-composer.md (mw-jtzpw0.6): the Governor's phone steps for Postern's composer shared with Lampas: Ask the tutor, Ask by, and a tapped attachment.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const doc = readFileSync('docs/demo-shared-composer.md', 'utf8');

function section(name: string): string {
  const match = doc.match(new RegExp(`^## ${name}\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'm'));
  expect(match, `a "## ${name}" section`).not.toBeNull();
  return match ? match[1] : '';
}

describe('docs/demo-shared-composer.md', () => {
  it.each([
    ['Lampas: ask by voice', ['Verse view', 'Ask the tutor', 'Hold to ask', 'Type a question']],
    ['Lampas: Ask by Typing', ['Settings', 'Ask by', 'Typing', 'Speaking', 'Send', 'Changed: Ask by: Typing']],
    ['Postern: a tapped attachment', ['Attach files', 'View', 'Close picture', 'View picture']],
  ])('has numbered steps for "%s" with its exact labels', (name, labels) => {
    const text = section(name);
    expect(text).toMatch(/^1\. /m);
    expect(text).toMatch(/^2\. /m);
    for (const label of labels) expect(text, `${name}: ${label}`).toContain(label);
  });

  it('ends with what the Governor says', () => {
    expect(doc).toContain('Looks good');
  });
});
