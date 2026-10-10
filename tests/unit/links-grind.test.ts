// The bible-talk grind's links (mw-5r3p30.160): the app draws a link only in a study resource he switched on, so with `resources` empty a link is a link no
// resource of his can open. The instructions are read by the mill, not by this app, so a grep proves the rule is stated, in every place that speaks of links.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const text = readFileSync('grinds/bible-talk.instructions.md', 'utf8');

/** A section of the instructions, up to the next one, on one line. */
const section = (heading: string): string => {
  const start = text.indexOf(heading);
  expect(start).toBeGreaterThan(-1);
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start, end < 0 ? undefined : end).replace(/\s+/g, ' ');
};

describe('links with no study resource on', () => {
  it('the links section says to leave links out when `resources` is empty or missing', () => {
    expect(section('## Links to his study resources')).toMatch(/With `resources` empty or missing, leave `links` out/);
  });

  it('the other-passages section says the same, so naming an Old Testament verse does not ask for a link', () => {
    const other = section('## Other passages');
    expect(other).toMatch(/\bonly when a resource in `resources` can open it\b/);
    expect(other).toMatch(/\bwith `resources` empty or missing, leave `links` out\b/i);
  });

  it('the Old Testament bullet of the links section is held to the same rule', () => {
    const links = section('## Links to his study resources');
    expect(links).toMatch(/text a New Testament writer quotes, link it, but only when a resource in `resources` can open it/);
  });
});
