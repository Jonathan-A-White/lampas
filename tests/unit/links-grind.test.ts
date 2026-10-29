// The bible-talk grind's links (mw-5r3p30.160): the app draws a link only in a study resource he switched on, so with `resources` empty a link is a link no
// resource of his can open. The instructions are read by the mill, not by this app, so a grep proves the rule is stated, in every place that speaks of links.
import { describe, expect, it } from 'vitest';
import { instructionsOf } from '../../scripts/grind-parts';
import '../support/grinds-in-graph';

const text = instructionsOf('bible-talk');

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

// mw-5r3p30.770: the example work-not-ticked (resources empty) missed 1 of 3 on 2026-10-26: the answer carried a verse link (1 John 4:9) beside the verse it named.
// The empty-`resources` rule sat in the third paragraph, after a verse bullet that says a New Testament verse opens in the Reader, so it was read as optional.
describe('the empty-`resources` rule leads the links section (mw-5r3p30.770)', () => {
  const links = section('## Links to his study resources');
  const rule = /With `resources` empty or missing, leave `links` out, except a setting link/g;

  it('is stated once, before the kinds of link are listed', () => {
    expect(links.match(rule)).toHaveLength(1);
    expect(links.search(rule)).toBeLessThan(links.indexOf('- `kind` `word`'));
  });

  it('says a verse named in the answer is no reason for a link, even a New Testament one', () => {
    const lead = links.slice(0, links.indexOf('- `kind` `word`'));
    expect(lead).toMatch(/a verse you name in `answer` is not a reason for a `verse` link/);
  });
});
