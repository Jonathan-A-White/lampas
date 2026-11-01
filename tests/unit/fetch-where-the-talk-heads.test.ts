// mw-5r3p30.937: fetch-where-the-talk-heads failed its smoke three times (2026-10-24 01:45Z, 10-28 18:45Z, 11-01 02:04Z,
// txid direct:ca75a900...) with the same answer, fetch ["Revelation 2:4", "Revelation 2:8-11"]: it reached Smyrna every time.
// The request held only 2:1-3, but his question leans on 2:4 ("Ephesus left its first love"), a verse held in neither `verses`
// nor `held_passages`, so the rules ("Other passages", and the contract's line on a verse outside `verses`) made fetching it
// right too; listed first, it failed the example's check on `fetch.0`, which reads one place of the list.
// The example now holds the whole letter to Ephesus (2:1-7), so the verses the talk heads to (Smyrna, 2:8-11) are the only
// ones it lacks, and the first fetch is theirs.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { checkExpect, type GrindExample } from '../support/grind-examples';
import '../support/grinds-in-graph';

const example = JSON.parse(readFileSync('grinds/examples/bible-talk/fetch-where-the-talk-heads.json', 'utf8')) as GrindExample & {
  request: { reference: string; verses: string; english: string; question: string };
};

/** The verse numbers a `verses` value such as `2:1-7` holds. */
function heldVerses(verses: string): number[] {
  const m = /^2:(\d+)(?:-(\d+))?$/.exec(verses);
  if (!m) throw new Error(`verses ${verses} is not a range of Revelation 2`);
  const from = Number(m[1]);
  const to = Number(m[2] ?? m[1]);
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

describe('fetch-where-the-talk-heads (mw-5r3p30.937)', () => {
  it('holds the verse his question leans on (2:4, the first love), so the tutor has no cause to fetch it', () => {
    expect(example.request.question).toMatch(/first love/);
    expect(heldVerses(example.request.verses)).toContain(4);
    expect(example.request.english).toMatch(/your first love/);
  });

  it('holds every verse of Revelation 2 before Smyrna and none of Smyrna, so what the talk heads to is all it lacks', () => {
    const held = heldVerses(example.request.verses);
    for (let n = 1; n <= 7; n++) expect(held, `verse ${n}`).toContain(n);
    for (let n = 8; n <= 11; n++) expect(held, `verse ${n}`).not.toContain(n);
  });

  it('passes each fetch the tutor has answered it with that reaches Smyrna', () => {
    for (const fetch of [['Revelation 2:8-11'], ['Revelation 2:4-11'], ['Revelation 2:10-11']]) {
      expect(checkExpect({ 'fetch.0': example.expect['fetch.0'] }, { fetch }), JSON.stringify(fetch)).toEqual([]);
    }
  });
});
