// Help (mw-5r3p30.823): a short list of the pieces of the app, one line each, each a tap to a page of under 120 words; the notes that left the Preface live on those pages; Ask the tutor at the top
// opens the round control's sheet with Help as the screen (src/tutor/askNow.ts). The Preface keeps only what we chose. The layout is proven by tests/e2e/help.spec.ts.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HelpScreen } from '../../src/HelpScreen';
import { HELP_MAX_PAGES, HELP_MAX_WORDS, HELP_PAGES, helpPageById, wordsOf } from '../../src/help';
import { routeOf } from '../../src/nav/route';
import { ESSAY_ORIGINAL_NOTE, ESSAY_RELEASE, PREFACE_LINKS, PREFACE_PARAGRAPHS } from '../../src/preface';
import { Preface } from '../../src/Preface';
import { askRequestNow } from '../../src/tutor/askNow';
import { FACT_VALUE_MAX, fitScreen, SCREEN_NAMES, suggestionsFor } from '../../src/tutor/screen';
import { screenContextNow } from '../../src/tutor/screenContext';

afterEach(cleanup);
beforeEach(() => {
  window.location.hash = '#/help';
});

const factsText = () => (screenContextNow()?.facts ?? []).map((f) => `${f.label}: ${f.value}`).join('\n');

describe('Help is a short list of pages', () => {
  it('has at most twelve pieces, each a title and one line, and a page of under 120 words', () => {
    expect(HELP_PAGES.length).toBeGreaterThanOrEqual(9);
    expect(HELP_PAGES.length).toBeLessThanOrEqual(HELP_MAX_PAGES);
    expect(new Set(HELP_PAGES.map((p) => p.id)).size).toBe(HELP_PAGES.length);
    for (const page of HELP_PAGES) {
      expect(page.line.length, `${page.title}'s line`).toBeLessThanOrEqual(40);
      expect(wordsOf(page), `${page.title} words`).toBeLessThan(HELP_MAX_WORDS);
      // the tutor is told each paragraph as a fact, which the request cuts at 400 characters
      for (const text of page.body) expect(text.length, `${page.title} paragraph`).toBeLessThanOrEqual(FACT_VALUE_MAX);
    }
  });

  it('has a piece for each part of the app the story names', () => {
    const titles = HELP_PAGES.map((p) => p.title.toLowerCase()).join('|');
    for (const piece of ['reader', 'goal', 'words', 'review', 'memorize', 'ladders', 'paradigms', 'tutor', 'licence']) expect(titles, piece).toContain(piece);
  });

  it('holds the notes that left the Preface on the right pages', () => {
    const body = (id: string) => helpPageById(id)?.body.join(' ') ?? '';
    expect(body('licence')).toContain('free to read');
    expect(body('licence')).toContain('Needs a licence');
    expect(body('licence')).toContain('Get a licence');
    expect(body('licence')).toContain('Twilio');
    expect(body('licence')).toContain('five devices');
    expect(body('languages')).toContain('Which languages?');
    expect(body('languages')).toContain('How much Hebrew?');
    expect(body('ladders')).toContain('More questions are on their way');
    expect(body('review')).toContain('Know it well');
    expect(body('paradigms')).toContain('This word | The pattern');
    expect(body('tutor')).toContain('Conversations');
    expect(body('library')).toContain('Maps');
    expect(body('memorize')).toContain('Due today');
  });

  it('is a route of its own', () => {
    expect(routeOf('#/help')).toBe('help');
    expect(routeOf('#/help?page=licence')).toBe('help');
    expect(SCREEN_NAMES.help).toBe('Help');
    expect(suggestionsFor('Help').length).toBeGreaterThanOrEqual(2);
  });
});

describe('the Help screen', () => {
  it('lists every piece as a button, with Ask the tutor first', () => {
    render(<HelpScreen />);
    const buttons = screen.getAllByRole('button').map((b) => b.textContent ?? '');
    expect(buttons.some((t) => t.startsWith('‹'))).toBe(true);
    const ask = screen.getByRole('button', { name: 'Ask the tutor' });
    for (const page of HELP_PAGES) {
      const row = screen.getByRole('button', { name: new RegExp(`^${page.title}`) });
      expect(row).toHaveTextContent(page.line);
      expect(ask.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING, `${page.title} after Ask the tutor`).toBeTruthy();
    }
  });

  it('tells the tutor its screen is Help, with a fact for each piece, so a question about the app is answered from it', () => {
    render(<HelpScreen />);
    expect(screenContextNow()?.name).toBe('Help');
    expect(screenContextNow()?.name).toBe(SCREEN_NAMES.help);
    for (const page of HELP_PAGES) expect(factsText()).toContain(`${page.title}: `);
    expect(factsText()).toContain('free to read');
    // what the request carries is what the schema takes: no fact is dropped
    const sent = fitScreen(screenContextNow()!);
    expect(sent.facts).toHaveLength(HELP_PAGES.length);
  });

  it('opens the tutor with the round control when Ask the tutor is tapped', () => {
    render(<HelpScreen />);
    const before = askRequestNow()?.id ?? 0;
    fireEvent.click(screen.getByRole('button', { name: 'Ask the tutor' }));
    expect(askRequestNow()?.id).toBeGreaterThan(before);
  });

  it('opens a page on a tap and tells the tutor the page in hand', () => {
    render(<HelpScreen />);
    fireEvent.click(screen.getByRole('button', { name: /^The licence/ }));
    expect(window.location.hash).toBe('#/help?page=licence');
  });

  it('draws the page the address names, in full, and reports it', () => {
    window.location.hash = '#/help?page=licence';
    render(<HelpScreen />);
    expect(screen.getByRole('heading', { name: 'The licence', level: 2 })).toBeVisible();
    expect(screen.getByText(/up to five devices/)).toBeVisible();
    expect(screenContextNow()?.name).toBe('Help');
    expect(factsText()).toContain('Page: The licence');
    expect(factsText()).toContain('five devices');
    expect(screen.getByRole('button', { name: 'Ask the tutor' })).toBeVisible();
  });

  it('draws the list for a page it does not know', () => {
    window.location.hash = '#/help?page=nonsense';
    render(<HelpScreen />);
    expect(screen.getByRole('button', { name: /^The licence/ })).toBeVisible();
  });
});

describe('the Preface keeps only what we chose', () => {
  const NOT_HERE = /licen[cs]e|twilio|phone check|free to read|needs a licence|get a licence/i;

  it('has no string that names a licence, Twilio, a phone check or free to read', () => {
    const strings = [
      ...PREFACE_PARAGRAPHS,
      ...PREFACE_LINKS.flatMap((l) => [l.name, l.about]),
      ESSAY_ORIGINAL_NOTE,
    ];
    for (const s of strings) expect(s).not.toMatch(NOT_HERE);
    // the essay's copy is a text the Preface links to, and says why it may carry it: "public domain" release, no licence page
    expect(ESSAY_RELEASE.length).toBeGreaterThan(0);
  });

  it('draws no app note: the page holds the texts, the English, the Hebrew and the sources', () => {
    render(<Preface />);
    expect(document.body.textContent).not.toMatch(NOT_HERE);
    expect(screen.queryByRole('heading', { name: 'Free to read' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Read more' })).toBeVisible();
  });
});
