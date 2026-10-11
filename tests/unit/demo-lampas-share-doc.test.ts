// docs/demo-lampas-share.md (mw-y3qno5.3): the Governor's phone steps for sharing or pasting a screenshot into a tutor talk.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const doc = readFileSync('docs/demo-lampas-share.md', 'utf8');

function section(name: string): string {
  const match = doc.match(new RegExp(`^## ${name}\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'm'));
  expect(match, `a "## ${name}" section`).not.toBeNull();
  return match ? match[1] : '';
}

describe('docs/demo-lampas-share.md', () => {
  it.each([
    ['Share a Logos screenshot into your latest talk', ['Share to Lampas', 'Continue:', 'Your message', 'Send', 'Pictures to send', 'δακρύω', 'ἐδάκρυσεν']],
    ['Share a second screenshot to a new talk', ['New talk', 'Choose a talk', 'Share to Lampas']],
    ['Paste a copied picture in a talk', ['Talk about', 'Pictures to send', 'Remove picture 1', 'Send']],
    ['If Lampas is missing from the share list', ['Install', 'Share']],
  ])('has numbered steps for "%s" with its exact labels', (name, labels) => {
    const text = section(name);
    expect(text).toMatch(/^1\. /m);
    expect(text).toMatch(/^2\. /m);
    for (const label of labels) expect(text, `${name}: ${label}`).toContain(label);
  });

  it('says what right looks like', () => {
    expect(section('Right')).toContain('tap');
  });

  it('ends with what the Governor says', () => {
    expect(doc).toContain('Looks good');
  });
});
