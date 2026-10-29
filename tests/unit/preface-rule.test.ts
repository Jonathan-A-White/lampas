// The Preface rule (docs/PREFACE.md, mw-5r3p30.847): the Preface is about the text we chose, never about the app. It fails when the Preface's text
// names an app screen or control. The list is kept here; a text note that needs one of these words says it another way.
import { readFileSync } from 'node:fs';
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Preface } from '../../src/Preface';
import { ESSAY_ORIGINAL_NOTE, PREFACE_EDITION_LINE, PREFACE_LINKS, PREFACE_PARAGRAPHS } from '../../src/preface';

afterEach(cleanup);

const APP_WORDS = ['Quiz me', 'Review', 'Quick test', 'Settings', 'Reader', 'Verse view', 'tap', 'button', 'dial', 'tutor', 'lesson screen'];

/** The app words a string names, each as a whole word, in any case. */
function appWordsIn(text: string): string[] {
  return APP_WORDS.filter((w) => new RegExp(`\\b${w}s?\\b`, 'i').test(text));
}

describe('the Preface names no app screen or control (docs/PREFACE.md)', () => {
  it('finds each word of the list, and lets a plain text note through', () => {
    for (const w of APP_WORDS) expect(appWordsIn(`Before ${w} after`), w).toEqual([w]);
    expect(appWordsIn('The Greek is the Byzantine Textform, and the English is the Majority Standard Bible.')).toEqual([]);
  });

  it('has none in its paragraphs, its links or the note under the original', () => {
    const strings = [...PREFACE_PARAGRAPHS, ...PREFACE_LINKS.flatMap((l) => [l.name, l.about]), ESSAY_ORIGINAL_NOTE];
    for (const s of strings) expect(appWordsIn(s), s).toEqual([]);
  });

  it('has none in the page as drawn', () => {
    render(createElement(Preface));
    expect(appWordsIn(document.querySelector('main')?.textContent ?? '')).toEqual([]);
  });

  it('says in one paragraph which Greek it shows: the base edition, the 2018 changes not applied, the 2026 wording laid over it', () => {
    expect(PREFACE_PARAGRAPHS).toContain(PREFACE_EDITION_LINE);
    expect(PREFACE_EDITION_LINE).toContain('2005 edition');
    expect(PREFACE_EDITION_LINE).toMatch(/2018 edition[^.]*accents?[^.]*capitals?[^.]*(not applied|are not|has the 2005 reading)/);
    expect(PREFACE_EDITION_LINE).toContain('Robinson-Pierpont 2026');
    expect(PREFACE_EDITION_LINE).toContain('the 2026 changes');
  });

  it('is named by docs/PREFACE.md and VISION.md', () => {
    const doc = readFileSync('docs/PREFACE.md', 'utf8');
    expect(doc).toContain('tests/unit/preface-rule.test.ts');
    expect(doc).toContain('docs/greek-edition.md');
    expect(readFileSync('VISION.md', 'utf8')).toContain('docs/PREFACE.md');
  });
});
