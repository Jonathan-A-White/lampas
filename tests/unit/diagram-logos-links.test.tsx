// tests/unit/diagram-logos-links.test.ts — 'See it in Logos' under a verse's diagram (mw-5r3p30.893): a Greek verse opens the Lexham Syntactic Greek New Testament and its Notes at the verse, a Hebrew
// verse opens his two Hebrew syntax grammars as books, both Diagrammatical Analysis; each link as src/resources/logosRes.ts builds one, and the row is drawn only while Logos is On.
import 'fake-indexeddb/auto';
import { cleanup, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { setResourceOn } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { DiagramPane } from '../../src/diagram/DiagramPane';
import { diagramLogosLinks } from '../../src/diagram/logosLinks';
import { loadFixture } from '../support/diagram-fixtures';

vi.mock('../../src/diagram/fetchDiagram', () => ({ fetchDiagram: vi.fn() }));
import { fetchDiagram } from '../../src/diagram/fetchDiagram';

const rom8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const gen1 = JSON.parse(readFileSync('public/data/gen/1.json', 'utf8')) as Chapter;

const DIAGRAM_ANALYSIS = { label: 'How to diagram', url: 'logosres:PDF:DIAGANALYSIS', fallback: 'https://ref.ly/logosres/PDF%3ADIAGANALYSIS' };

beforeEach(async () => {
  clearBus();
  window.history.replaceState(null, '', '/');
  await Promise.all(db.tables.map((table) => table.clear()));
});
afterEach(() => {
  cleanup();
  vi.mocked(fetchDiagram).mockReset();
});

describe('diagramLogosLinks', () => {
  it('Romans 8:1: the Lexham SGNT and its Notes at the verse, then Diagrammatical Analysis', () => {
    expect(diagramLogosLinks({ book: 'rom', chapter: 8, verse: 1 }, 'grc')).toEqual([
      { label: 'Lexham SGNT', url: 'logosres:LLS:LEXHAMSGNT;ref=Bible.Ro8.1', fallback: 'https://ref.ly/logosres/LLS%3ALEXHAMSGNT?ref=Bible.Ro8.1' },
      { label: 'SGNT Notes', url: 'logosres:LLS:SGNTNOTES;ref=Bible.Ro8.1', fallback: 'https://ref.ly/logosres/LLS%3ASGNTNOTES?ref=Bible.Ro8.1' },
      DIAGRAM_ANALYSIS,
    ]);
  });

  it('Genesis 1:1: the two Hebrew syntax grammars as books, then Diagrammatical Analysis', () => {
    expect(diagramLogosLinks({ book: 'gen', chapter: 1, verse: 1 }, 'hbo')).toEqual([
      { label: 'Hebrew Syntax', url: 'logosres:LLS:46.20.9', fallback: 'https://ref.ly/logosres/LLS%3A46.20.9' },
      { label: "Student's Guide", url: 'logosres:LLS:46.20.3', fallback: 'https://ref.ly/logosres/LLS%3A46.20.3' },
      DIAGRAM_ANALYSIS,
    ]);
  });

  it('a book Lampas cannot name in a reference has no verse links, only the how-to', () => {
    expect(diagramLogosLinks({ book: 'zzz', chapter: 1, verse: 1 }, 'grc')).toEqual([DIAGRAM_ANALYSIS]);
  });
});

function drawn(chapter: Chapter, mode: 'greek' | 'hebrew'): void {
  const fixture = loadFixture(mode);
  vi.mocked(fetchDiagram).mockResolvedValue({ ok: true, diagram: fixture.diagram, words: fixture.words, kept: true });
  render(<DiagramPane chapter={chapter} verse={chapter.verses[0]} view="greek" onLook={() => undefined} />);
}

describe('the row under the diagram', () => {
  it('is drawn on Romans 8:1 while Logos is On, with the links of a Greek verse', async () => {
    await setResourceOn('logos', true);
    drawn(rom8, 'greek');
    const row = await screen.findByRole('group', { name: 'See it in Logos' });
    expect(within(row).getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Lexham SGNT', 'logosres:LLS:LEXHAMSGNT;ref=Bible.Ro8.1'],
      ['SGNT Notes', 'logosres:LLS:SGNTNOTES;ref=Bible.Ro8.1'],
      ['How to diagram', 'logosres:PDF:DIAGANALYSIS'],
    ]);
    expect(within(row).getByRole('link', { name: 'Lexham SGNT' })).toHaveAttribute('data-fallback', 'https://ref.ly/logosres/LLS%3ALEXHAMSGNT?ref=Bible.Ro8.1');
  });

  it('is drawn on Genesis 1:1 while Logos is On, with the two Hebrew syntax books', async () => {
    await setResourceOn('logos', true);
    drawn(gen1, 'hebrew');
    const row = await screen.findByRole('group', { name: 'See it in Logos' });
    expect(within(row).getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Hebrew Syntax', 'logosres:LLS:46.20.9'],
      ["Student's Guide", 'logosres:LLS:46.20.3'],
      ['How to diagram', 'logosres:PDF:DIAGANALYSIS'],
    ]);
  });

  it('is not drawn while Logos is Off', async () => {
    drawn(rom8, 'greek');
    await screen.findByRole('button', { name: 'Redraw' });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('group', { name: 'See it in Logos' })).toBeNull();
    expect(screen.queryByText('See it in Logos')).toBeNull();
  });
});
