// tests/unit/old-testament-choices.test.ts — src/resources/oldTestamentChoices.ts: the two ways out of an Old Testament chapter, Read in Logos and Listen in Audible, are the links the chapter picker
// offered before they became actions on the opened chapter (mw-uqlxea.2, src/reader/ChapterActions.tsx): the same href and fallback, each only while its setting is on.
import { describe, expect, it } from 'vitest';
import { audibleChapterLabel, audibleListen, audioBibleOf } from '../../src/resources/audioBible';
import { DEFAULT_LOGOS_BIBLE, chapterLink } from '../../src/resources/logosBible';
import { oldTestamentChoices } from '../../src/resources/oldTestamentChoices';

const AUDIO = audioBibleOf('word-of-promise');
const NOW = 1_800_000_000_000;

describe('oldTestamentChoices', () => {
  it('gives the chapter Logos link, in the Bible he chose, as the picker always made it', () => {
    const { logos } = oldTestamentChoices('jdg', 3, { logosOn: true, logosBible: DEFAULT_LOGOS_BIBLE, audio: undefined });
    const link = chapterLink('jdg', 3, DEFAULT_LOGOS_BIBLE);
    expect(link).toBeDefined();
    expect(logos).toEqual({ href: link?.url, fallback: link?.fallback });
    expect(logos?.href).toBe('logosres:lgcystndrdbblsb;ref=Bible.Jdg3');
    expect(logos?.fallback).toBe('https://ref.ly/logosres/lgcystndrdbblsb?ref=Bible.Jdg3');
    expect(oldTestamentChoices('mal', 4, { logosOn: true, logosBible: 'LLS:NASB95', audio: undefined }).logos?.href).toBe('logosres:nasb95;ref=Bible.Mal4');
  });

  it("gives Audible's link at the start of the chapter, stamped with the time of the tap, and Audible's own name for the chapter", () => {
    expect(AUDIO).toBeDefined();
    const { audible } = oldTestamentChoices('jdg', 3, { logosOn: false, logosBible: DEFAULT_LOGOS_BIBLE, audio: AUDIO, now: NOW });
    expect(audible).toEqual({ ...audibleListen(AUDIO!, 'jdg', 3, NOW), label: audibleChapterLabel('jdg', 3) });
    expect(audible?.label).toBe('Judges 3');
  });

  it('offers each only while its setting is on', () => {
    expect(oldTestamentChoices('jon', 1, { logosOn: false, logosBible: DEFAULT_LOGOS_BIBLE, audio: undefined })).toEqual({ logos: undefined, audible: undefined });
    const both = oldTestamentChoices('jon', 1, { logosOn: true, logosBible: DEFAULT_LOGOS_BIBLE, audio: AUDIO });
    expect(both.logos).toBeDefined();
    expect(both.audible).toBeDefined();
    expect(oldTestamentChoices('jon', 1, { logosOn: true, logosBible: DEFAULT_LOGOS_BIBLE, audio: undefined }).audible).toBeUndefined();
    expect(oldTestamentChoices('jon', 1, { logosOn: false, logosBible: DEFAULT_LOGOS_BIBLE, audio: AUDIO }).logos).toBeUndefined();
  });
});
