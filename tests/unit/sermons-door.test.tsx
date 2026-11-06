// The Sermons door (src/sermons/SermonsDoor.tsx, mw-qtu3zvz.2): a 44 px button 'Sermons · N', drawn only when N is above 0, and the sheet it opens (SermonsSheet.tsx).
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SermonsDoor } from '../../src/sermons/SermonsDoor';
import { SermonsHost } from '../../src/sermons/SermonsSheet';
import { closeSermons } from '../../src/sermons/openSermons';
import { forgetTestSermons, registerTestSermons } from '../support/test-sermons';

afterEach(() => {
  cleanup();
  closeSermons();
  forgetTestSermons();
});

const settle = (ms = 50) => act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

describe('the Sermons door', () => {
  beforeEach(() => registerTestSermons());

  it('is labelled Sermons · N with the count of the chapter’s rows, 44 px tall', async () => {
    render(<SermonsDoor place={{ book: 'rom', chapter: 5, from: 8, to: 8 }} />);
    const door = await screen.findByRole('button', { name: 'Sermons · 4' });
    expect(door.className).toContain('min-h-11');
    expect(door).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('counts the sources together', async () => {
    registerTestSermons({ second: true });
    render(<SermonsDoor place={{ book: 'rom', chapter: 5 }} />);
    expect(await screen.findByRole('button', { name: 'Sermons · 5' })).toBeInTheDocument();
  });

  it('is not drawn where a chapter has no sermons', async () => {
    render(<SermonsDoor place={{ book: 'rom', chapter: 9, from: 1, to: 1 }} />);
    await settle();
    expect(screen.queryByRole('button', { name: /^Sermons/ })).toBeNull();
  });

  it('is not drawn where every source is off', async () => {
    registerTestSermons({ off: true });
    render(<SermonsDoor place={{ book: 'rom', chapter: 5, from: 8, to: 8 }} />);
    await settle();
    expect(screen.queryByRole('button', { name: /^Sermons/ })).toBeNull();
  });
});

describe('the Sermons sheet', () => {
  beforeEach(() => registerTestSermons({ second: true }));
  const user = userEvent.setup();

  async function openFor(place: { book: string; chapter: number; from?: number; to?: number }) {
    render(
      <>
        <SermonsDoor place={place} />
        <SermonsHost />
      </>,
    );
    await user.click(await screen.findByRole('button', { name: /^Sermons · / }));
    return screen.findByRole('dialog', { name: /^Sermons for / });
  }

  it('is headed for a verse, groups its rows On this verse and In this chapter, each row a plain link 44 px tall', async () => {
    const sheet = await openFor({ book: 'rom', chapter: 5, from: 8, to: 8 });
    expect(sheet).toHaveAttribute('aria-label', 'Sermons for Romans 5:8');
    expect(within(sheet).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['On this verse', 'In this chapter']);
    const rows = [...sheet.querySelectorAll<HTMLAnchorElement>('a[data-sermon-row]')];
    expect(rows.map((r) => r.querySelector('[data-sermon-title]')?.textContent)).toEqual(['Love Commended', 'Peace with God', 'God’s Love Shown', 'Reigning in Life', 'Death in Adam, Life in Christ']);
    for (const r of rows) {
      expect(r.className).toContain('min-h-11');
      expect(r).toHaveAttribute('target', '_blank');
      expect(r).toHaveAttribute('rel', 'noopener noreferrer');
    }
    expect(rows[0]).toHaveAttribute('href', 'https://sermons.test/testsermons/love');
  });

  it('gives a row the preacher, the date and where it opens on the second line', async () => {
    const sheet = await openFor({ book: 'rom', chapter: 5, from: 8, to: 8 });
    const second = (title: string) => [...sheet.querySelectorAll('a[data-sermon-row]')].find((r) => r.querySelector('[data-sermon-title]')?.textContent === title)?.querySelector('[data-sermon-meta]')?.textContent;
    expect(second('Love Commended')).toBe('Test Preacher · 14 Mar 1880 · Opens on the web');
    expect(second('Reigning in Life')).toBe('Test Preacher · 1872 · Opens on the web');
    expect(second('Death in Adam, Life in Christ')).toBe('Test Preacher · Oct 1866 · Opens on the web');
    expect(second('God’s Love Shown')).toBe('Test Second Preacher · Opens on the web');
  });

  it('is headed for a passage with On these verses, and for a chapter with In this chapter alone', async () => {
    let sheet = await openFor({ book: 'rom', chapter: 5, from: 1, to: 11 });
    expect(sheet).toHaveAttribute('aria-label', 'Sermons for Romans 5:1-11');
    expect(within(sheet).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['On these verses', 'In this chapter']);
    cleanup();
    closeSermons();
    sheet = await openFor({ book: 'rom', chapter: 5 });
    expect(sheet).toHaveAttribute('aria-label', 'Sermons for Romans 5');
    expect(within(sheet).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['In this chapter']);
  });

  it('says Needs the internet on each row while the phone is offline, and keeps the rows', async () => {
    const online = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    try {
      const sheet = await openFor({ book: 'rom', chapter: 5, from: 8, to: 8 });
      const metas = [...sheet.querySelectorAll('[data-sermon-meta]')].map((m) => m.textContent);
      expect(metas).toHaveLength(5);
      expect(metas.every((m) => m?.endsWith('Needs the internet') && !m.includes('Opens on the web'))).toBe(true);
    } finally {
      delete (navigator as unknown as Record<string, unknown>).onLine;
      if (online) Object.defineProperty(Navigator.prototype, 'onLine', online);
    }
  });

  it('closes with Close', async () => {
    const sheet = await openFor({ book: 'rom', chapter: 5, from: 8, to: 8 });
    await user.click(within(sheet).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
