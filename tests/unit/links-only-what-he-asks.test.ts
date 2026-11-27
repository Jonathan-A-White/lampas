// mw-5r3p30.1230 (fold of mw-5r3p30.1149, .1222, .1229): the tutor added a link nobody asked for. On work-not-relevant ('Why does ἀγαπῶσιν
// end in -σιν?') it gave a contract-verbs paradigm link, on map-of-the-passage a second map (TableOfNationsHam) or the wrong one, on
// no-sermon-listed a sermons setting link (now named in the sermon section), on play-sermon a sermon link beside the play. One rule near the top of 'Links to his study
// resources' now says it: link only what he asks to see, read, copy or share (or a word or verse that takes him deeper), ONE link for it, and
// none when he asks why or to play, or none is listed; the map line says the first line with `places` wins even when another title fits.
// The model's side is proved by `mw grist eval lampas bible-talk --example <name> --ref <branch>`; this pins the words and the examples.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { instructionParts } from '../../scripts/grind-parts';
import '../support/grinds-in-graph';

const part = instructionParts('bible-talk').find(({ file }) => file.endsWith('200-links-to-his-study-resources.md'));
const links = (part?.text ?? '').replace(/\s+/g, ' ');
const intro = links.slice(0, links.indexOf('### Links to a setting'));
const count = (haystack: string, needle: RegExp): number => (haystack.match(needle) ?? []).length;
type Example = { request: Record<string, unknown>; expect: Record<string, unknown> };
const example = (name: string): Example => JSON.parse(readFileSync(`grinds/examples/bible-talk/${name}.json`, 'utf8')) as Example;

describe('the bible-talk links rule: only what he asks for, one link for it (mw-5r3p30.1230)', () => {
  it('says once, before the kinds, to link only what he asks to see, read, copy or share, ONE link for it, no second and none of another kind', () => {
    expect(count(intro, /Link only what he asks to see, read, copy or share/g)).toBe(1);
    expect(intro).toContain('ONE link for it, no second and none of another kind');
  });

  it('says no link at all when he asks why or to play, or none is listed', () => {
    expect(intro).toContain('NO link when he asks why or to play, or none is listed');
  });

  it('says in the sermon section that no `sermons` gets none is listed with NO link, never a `sermons.<id>` setting, not even for the preacher he names', () => {
    const sermon = links.slice(links.indexOf('### Links to a sermon'), links.indexOf('### Links to a paradigm table'));
    expect(sermon).toContain('With no `sermons`, say none is listed (and In another book) and give NO link, never a `sermons.<id>` setting, not even for the preacher he names.');
  });

  // mw-qtu3zvz.284: on sermon-narrowed ('only on grace', no history) the tutor read the words as the verse seen through grace, 3 of 6 live runs,
  // and answered in its own words with no sermon link or with the verse's own row (104); 'To narrow' said what to do, never how to know a narrowing.
  it('says in the sermon section that a bare theme, preacher or date, with `sermons` listed, narrows them and not the verse, even as the first words', () => {
    const sermon = links.slice(links.indexOf('### Links to a sermon'), links.indexOf('### Links to a paradigm table'));
    expect(sermon).toContain("With `sermons`, a bare theme, preacher or date ('only on grace') narrows them, not the verse, even as his first words. To narrow, answer with the rows that fit");
    expect(sermon.indexOf("('only on grace')")).toBeLessThan(sermon.indexOf('never one outside the narrowing'));
    const narrowed = example('sermon-narrowed');
    expect(narrowed.request.question).toBe('only on grace');
    expect(narrowed.request.history).toEqual([]);
  });

  it('says the map link goes to the first line with `places` even when another title fits the chapter', () => {
    const map = links.slice(links.indexOf('### Links to a map'), links.indexOf('### Links to a sermon'));
    expect(map).toContain('give ONE link, to the first line with `places` even when another title fits the chapter');
  });

  // mw-5r3p30.1255: .1254's trim dropped this sentence and map-in-logos then linked SodomAndGomorrah, not the Logos row he named, in 2 of 3 smoke runs.
  it('says what a line\'s `places` are before it says to link the first line with them, so a row with none (a Logos row he names) is not read as the one to take', () => {
    const map = links.slice(links.indexOf('### Links to a map'), links.indexOf('### Links to a sermon'));
    expect(map).toContain('A line\'s `places` are those the verse names, most places first.');
    expect(map.indexOf('A line\'s `places`')).toBeLessThan(map.indexOf('to the first line with `places`'));
  });

  it.each([
    ['work-not-relevant', 'links.0'],
    ['no-sermon-listed', 'links'],
    ['play-sermon', 'links.0'],
  ])('keeps %s expecting no link (%s absent)', (name, key) => {
    expect(example(name).expect[key]).toEqual({ present: false });
  });

  it('keeps map-of-the-passage expecting one map link, to SodomAndGomorrah, and no second', () => {
    const map = example('map-of-the-passage');
    expect(map.expect['links.0.map']).toEqual({ equals: 'SodomAndGomorrah' });
    expect(map.expect['links.1']).toEqual({ present: false });
  });
});
