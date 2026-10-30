import { cleanup, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { About } from '../../src/About';
import { parseAttribution } from '../../src/attribution';
import { VARIANT_LESSONS } from '../../src/lessons/variants';
import { Markdown } from '../../src/markdown/Markdown';
import { stripComments } from '../../src/markdown/comments';

afterEach(cleanup);

const DOC = [
  '# Title',
  '',
  '<!-- toc: none -->',
  '',
  'First paragraph stays.',
  '',
  '<!-- toc -->',
  '- [Alpha](#alpha)',
  '- [Beta](#beta)',
  '<!-- /toc -->',
  '',
  '<!--',
  'a note over',
  'several lines',
  '-->',
  'Middle paragraph <!-- inline note --> stays too.',
  '',
  '## Alpha',
  '',
  'Last paragraph stays.',
].join('\n');

describe('the app drops HTML comments and the table of contents `mw toc` writes (mw-5r3p30.883)', () => {
  it('renders the text around a toc marker, a toc block and a multi-line comment, and none of them', () => {
    const { container } = render(<Markdown text={DOC} />);
    const shown = container.textContent ?? '';
    expect(shown).not.toContain('<!--');
    expect(shown).not.toContain('-->');
    expect(shown).not.toContain('toc');
    expect(shown).not.toContain('note over');
    expect(shown).not.toContain('inline note');
    expect(container.querySelector('li')).toBeNull();
    for (const kept of ['First paragraph stays.', 'Middle paragraph', 'stays too.', 'Last paragraph stays.']) expect(shown).toContain(kept);
  });

  it('strips them in the form the other screens read too', () => {
    expect(stripComments(DOC)).not.toContain('<!--');
    expect(stripComments('a <!-- x --> b')).toBe('a  b');
  });

  it('shows no marker on About, whatever ATTRIBUTION.md holds', () => {
    const doc = parseAttribution(readFileSync('ATTRIBUTION.md', 'utf8'));
    expect(doc.intro).not.toContain('<!--');
    expect(parseAttribution('# A\n\n<!-- toc: none -->\n\n> q\n> — by\n\nIntro here.\n\n## S\n\n- one\n').intro).toBe('Intro here.');
    const { container } = render(<About />);
    expect(container.textContent).not.toContain('<!--');
    expect(container.querySelector('blockquote + p')?.textContent?.startsWith('Lampas stands on')).toBe(true);
  });

  it('shows no marker in a variant lesson', () => {
    for (const lesson of VARIANT_LESSONS) {
      const { container } = render(<Markdown text={lesson.markdown} trusted />);
      expect(container.textContent).not.toContain('<!--');
      cleanup();
    }
  });
});
