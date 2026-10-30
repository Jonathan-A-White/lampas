// tests/unit/book-links.test.ts — a book the app's prose names links to its Logos store page when Logos sells it, else to Amazon (mw-9ji6ek0.38). The list is
// data/books.json; src/markdown/bookLinks.ts is the one Markdown plug-in that reads it, so a book is linked in a lesson, a tutor's answer and a setting's help alike.
import 'fake-indexeddb/auto';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { VARIANT_LESSONS } from '../../src/lessons/variants';
import { Markdown } from '../../src/markdown/Markdown';
import { BOOKS, bookUrl, booksIn } from '../../src/markdown/bookLinks';
import { isKnownLink, isResourceLink, RESOURCE_HOSTS } from '../../src/resources/hosts';
import { stubChapterFetch } from '../support/chapter-fetch';

beforeEach(async () => {
  clearBus();
  stubChapterFetch();
  window.history.replaceState(null, '', '/');
  await Promise.all(db.tables.map((table) => table.clear()));
});
afterEach(cleanup);

const byTitle = (title: string) => {
  const book = BOOKS.find((b) => b.title === title);
  if (!book) throw new Error(`no book titled ${title}`);
  return book;
};

const METZGER = 'A Textual Commentary on the Greek New Testament';
const WASSERMAN = 'A New Approach to Textual Criticism';

describe('data/books.json', () => {
  it('gives every book a title, an author and a URL, Logos ones on the store and Amazon ones on amazon.com', () => {
    expect(BOOKS.length).toBeGreaterThan(0);
    for (const b of BOOKS) {
      expect(b.title.trim(), 'title').not.toBe('');
      expect(b.authors.length, `${b.title} authors`).toBeGreaterThan(0);
      for (const a of b.authors) expect(a.trim(), `${b.title} author`).not.toBe('');
      expect(b.logos !== undefined || b.amazon !== undefined, `${b.title} has a URL`).toBe(true);
      if (b.logos !== undefined) expect(b.logos, `${b.title} Logos`).toMatch(/^https:\/\/www\.logos\.com\/product\/\d+\//);
      if (b.amazon !== undefined) expect(b.amazon, `${b.title} Amazon`).toMatch(/^https:\/\/www\.amazon\.com\//);
    }
  });

  it('lists a title once, and links to Logos before Amazon', () => {
    const titles = BOOKS.map((b) => b.title.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
    const withBoth = BOOKS.find((b) => b.logos !== undefined && b.amazon !== undefined);
    expect(withBoth).toBeDefined();
    expect(bookUrl(withBoth!)).toBe(withBoth!.logos);
    const amazonOnly = BOOKS.find((b) => b.logos === undefined);
    expect(amazonOnly).toBeDefined();
    expect(bookUrl(amazonOnly!)).toBe(amazonOnly!.amazon);
  });

  it('holds every title the lessons name as further reading', () => {
    const named = new Set<string>();
    for (const lesson of VARIANT_LESSONS) {
      for (const line of lesson.markdown.split('\n').filter((l) => /^(- )?Further reading/.test(l))) {
        for (const m of line.matchAll(/\*([^*]+)\*/g)) named.add(m[1]);
      }
    }
    expect(named.size).toBeGreaterThanOrEqual(5);
    for (const title of named) expect(booksIn(`*${title}*`).map((f) => f.book.title), title).toHaveLength(1);
  });
});

describe('a listed title in a Markdown render', () => {
  it('is a link to its Logos page, in italics or plain, in any case', () => {
    const logos = byTitle(METZGER).logos;
    expect(logos).toBeDefined();
    const { container } = render(
      createElement(Markdown, { text: `Bruce Metzger's *${METZGER}* is one; ${METZGER.toLowerCase()} is the same book.`, trusted: true }),
    );
    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(2);
    for (const a of links) expect(a).toHaveAttribute('href', logos);
    expect(links[0]).toHaveTextContent(METZGER);
    expect(links[0].closest('em')).not.toBeNull();
    expect(links[1].closest('em')).toBeNull();
    expect(links[0]).toHaveAttribute('target', '_blank');
    expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('is a link to its Amazon page when Logos does not sell it', () => {
    const book = BOOKS.find((b) => b.logos === undefined)!;
    render(createElement(Markdown, { text: `Read *${book.title}*.`, trusted: true }));
    expect(screen.getByRole('link', { name: book.title })).toHaveAttribute('href', book.amazon);
  });

  it('links the lesson paragraph that names two books', () => {
    const lesson = VARIANT_LESSONS.find((l) => l.id === 'byzantine-na-ecm')!;
    const { container } = render(createElement(Markdown, { text: lesson.markdown, trusted: true }));
    const hrefs = (title: string) => [...container.querySelectorAll('a')].filter((a) => a.textContent === title).map((a) => a.getAttribute('href'));
    expect(hrefs('The Greek New Testament according to the Majority Text')).toEqual([byTitle('The Greek New Testament according to the Majority Text').logos]);
    expect(hrefs(WASSERMAN)).toEqual([byTitle(WASSERMAN).logos]);
  });

  it('leaves an unlisted title, and ordinary words, alone', () => {
    const { container } = render(
      createElement(Markdown, {
        text: 'Read *A Book Nobody Listed* by Someone, and the text of the New Testament as it stands; a commentary on the Greek.',
        trusted: true,
      }),
    );
    expect(container.querySelectorAll('a')).toHaveLength(0);
  });

  it('takes a title only whole, not inside a longer word or a longer title', () => {
    expect(booksIn(`Not${WASSERMAN}x`)).toHaveLength(0);
    const metzgerEhrman = BOOKS.find((b) => b.authors.some((a) => a.includes('Ehrman')))!;
    const found = booksIn(`${metzgerEhrman.title} and *The Text of the New Testament*`);
    expect(found.map((f) => f.book.title)).toEqual([metzgerEhrman.title, 'The Text of the New Testament']);
  });

  it('keeps a generic title to its own capitals, so the words "the text of the New Testament" are not a book', () => {
    expect(booksIn('the text of the New Testament was copied by hand')).toHaveLength(0);
    expect(booksIn('The Text of the New Testament')).toHaveLength(1);
  });

  it('does not link a title written inside a link already', () => {
    const { container } = render(createElement(Markdown, { text: `[${METZGER}](https://example.org/x)`, trusted: true }));
    expect(container.querySelectorAll('a')).toHaveLength(1);
    expect(container.querySelector('a')).toHaveAttribute('href', 'https://example.org/x');
  });

  it('still opens the card of a verse reference beside a title', async () => {
    render(createElement(Markdown, { text: `*${METZGER}* explains Hebrews 7:2.` }));
    await userEvent.click(screen.getByRole('link', { name: 'Hebrews 7:2' }));
    const card = await screen.findByRole('dialog', { name: 'Hebrews 7:2' });
    expect(within(card).getByRole('button', { name: /open/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: METZGER })).toHaveAttribute('href', byTitle(METZGER).logos);
  });
});

describe('a tutor answer (the Markdown Talk draws, not trusted)', () => {
  it('links a listed title and leaves an unlisted one plain', () => {
    const { container } = render(createElement(Markdown, { text: `For the method, see *${WASSERMAN}*; also *Some Other Book*.` }));
    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', byTitle(WASSERMAN).logos);
    expect(container.textContent).toContain('Some Other Book');
  });

  it('draws a link the model wrote to Amazon or the Logos store, which is now an allowed host', () => {
    const { container } = render(
      createElement(Markdown, { text: '[a](https://www.amazon.com/s?k=x) [b](https://www.logos.com/product/2190/x) [c](https://evil.example/x)' }),
    );
    expect([...container.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual([
      'https://www.amazon.com/s?k=x',
      'https://www.logos.com/product/2190/x',
    ]);
  });
});

describe('the hosts a link may point at', () => {
  it('include the Logos store and Amazon, https only', () => {
    expect(RESOURCE_HOSTS).toContain('www.logos.com');
    expect(RESOURCE_HOSTS).toContain('www.amazon.com');
    expect(isResourceLink('https://www.logos.com/product/2190/a-textual-commentary')).toBe(true);
    expect(isKnownLink('https://www.amazon.com/s?k=metzger')).toBe(true);
    expect(isResourceLink('http://www.amazon.com/s?k=metzger')).toBe(false);
    expect(isResourceLink('https://www.amazon.com.evil.example/s')).toBe(false);
  });
});
