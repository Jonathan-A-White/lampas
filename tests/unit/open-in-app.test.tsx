// tests/unit/open-in-app.test.tsx — 'Open in the app' (mw-5r3p30.1041): in a Chrome tab on Android where navigator.getInstalledRelatedApps names the installed
// Lampas, one labelled control hands the same address to Android through an intent: URL. Not where the API is absent or reports nothing, not in the installed app,
// not once dismissed for the session, and nothing leaves the page but his tap.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const goTo = vi.hoisted(() => vi.fn());
vi.mock('../../src/openInApp', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../src/openInApp')>()), goTo }));

import { OpenInApp } from '../../src/OpenInApp';
import { DISMISSED_KEY, handedHref, intentUrl, verseOnTop } from '../../src/openInApp';
import { linkOf } from '../../src/nav/links';
import { readerOf } from '../../src/nav/route';

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const DESKTOP = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

function setup({ ua = ANDROID, standalone = false, apps }: { ua?: string; standalone?: boolean; apps?: unknown[] | 'absent' } = {}) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: standalone && /standalone/.test(query), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const asked = vi.fn(async () => apps ?? [{ platform: 'webapp', url: 'https://lampas.allmymind.org/manifest.webmanifest' }]);
  if (apps === 'absent') delete (navigator as unknown as Record<string, unknown>).getInstalledRelatedApps;
  else Object.defineProperty(navigator, 'getInstalledRelatedApps', { value: asked, configurable: true, writable: true });
  return asked;
}

const control = () => screen.queryByRole('button', { name: 'Open in the app' });

beforeEach(() => {
  goTo.mockReset();
  window.history.replaceState(null, '', '/#/?b=rom&c=8&v=28');
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (navigator as unknown as Record<string, unknown>).getInstalledRelatedApps;
});

const ORIGIN = 'https://lampas.allmymind.org';

describe('intentUrl', () => {
  it('hands the address, with the verse in a form a fresh app opens at, to Android', () => {
    const url = intentUrl(`${ORIGIN}/#/?b=rom&c=8&v=28`);
    expect(url.startsWith('intent://lampas.allmymind.org/#/?ref=Rom.8.28#Intent;')).toBe(true);
    expect(url).toContain(';scheme=https;');
    expect(url.endsWith(';end')).toBe(true);
    // a tab that stays open when the app does not take it
    expect(url).toContain(`S.browser_fallback_url=${encodeURIComponent(`${ORIGIN}/#/?ref=Rom.8.28`)}`);
  });
  it('puts the verse at the top of the box in an address that has none', () => {
    expect(intentUrl(`${ORIGIN}/#/?b=rom&c=8&view=english&weave=off`, 28)).toContain('/#/?ref=Rom.8.28&view=english&weave=off#Intent;');
  });
  it('keeps a port and a plain http scheme, for a preview', () => {
    expect(intentUrl('http://localhost:4173/#/words')).toMatch(/^intent:\/\/localhost:4173\/#\/words#Intent;scheme=http;/);
  });
});

// Every address the app shows in a Reader, handed through intentUrl, opens a fresh app (no saved place) on the same chapter and verse: the address inside the intent is read as the
// app reads it (linkOf, src/nav/links.ts; LinkOpener turns it into the chapter with the verse brought to the top).
describe('handedHref: one case per form of the Reader\'s address', () => {
  const cases: { name: string; address: string; onTop?: number | null; hash: string }[] = [
    { name: 'a link with ref= not yet opened', address: '#/?ref=Rom.8.28', hash: '#/?ref=Rom.8.28' },
    { name: 'a link with ref= and a view', address: '#/?ref=Rom.8.28&view=greek', hash: '#/?ref=Rom.8.28&view=greek' },
    { name: 'the Reader after its link opened (no verse in the address), verse 28 at the top', address: '#/?b=rom&c=8&view=english&weave=off', onTop: 28, hash: '#/?ref=Rom.8.28&view=english&weave=off' },
    { name: 'the Reader at the top of a chapter', address: '#/?b=rom&c=8&view=english&weave=off', hash: '#/?ref=Rom.8&view=english&weave=off' },
    { name: 'a verse selected', address: '#/?b=rom&c=8&view=greek&weave=solid&v=28', hash: '#/?ref=Rom.8.28&view=greek&weave=solid' },
    { name: 'a verse selected wins over the box', address: '#/?b=rom&c=8&v=5', onTop: 28, hash: '#/?ref=Rom.8.5' },
    { name: 'a passage under a heading', address: '#/?b=rom&c=8&p=5', hash: '#/?ref=Rom.8.5' },
    { name: 'a range keeps its range', address: '#/?b=rom&c=8&p=1&pt=11', hash: '#/?ref=Rom.8.1-11' },
    { name: 'a chapter picked (no verse yet)', address: '#/?b=1jn&c=1', hash: '#/?ref=1John.1' },
    { name: 'a chapter with no book is Romans', address: '#/?c=8', onTop: 12, hash: '#/?ref=Rom.8.12' },
    { name: 'an Old Testament chapter', address: '#/?b=gen&c=1&v=3', hash: '#/?ref=Gen.1.3' },
    { name: 'a book whose OSIS code is not its own', address: '#/?b=1th&c=4&v=16', hash: '#/?ref=1Thess.4.16' },
  ];
  for (const { name, address, onTop = null, hash } of cases) {
    it(name, () => {
      const handed = new URL(handedHref(`${ORIGIN}/${address}`, onTop));
      expect(handed.origin + handed.pathname).toBe(`${ORIGIN}/`);
      expect(handed.hash).toBe(hash);
      // the app reads it as a reference link, and its chapter and verse are the address's
      const link = linkOf(handed.hash)!;
      expect(link.kind).toBe('reference');
      expect(link.text).toBe(new URLSearchParams(hash.slice(hash.indexOf('?'))).get('ref'));
      const at = readerOf(address);
      if (at.chapter !== undefined) expect(link.text.split('.')[1]).toBe(String(at.chapter));
      // and through the intent: URL itself
      expect(intentUrl(`${ORIGIN}/${address}`, onTop).startsWith(`intent://lampas.allmymind.org/${hash}#Intent;`)).toBe(true);
    });
  }
  it.each(['#/words', '#/settings?setting=x', '#/?word=G3551', '#/', '#/memorize/Rom.8.28/en'])('hands %s as it is: it is no place in a chapter, or already a link', (address) => {
    expect(handedHref(`${ORIGIN}/${address}`, 5)).toBe(`${ORIGIN}/${address}`);
  });
});

describe('verseOnTop', () => {
  afterEach(() => void (document.body.innerHTML = ''));
  const draw = (paging: 'scroll' | 'pages', verses: number[]) => {
    document.body.innerHTML = `<main data-reader data-paging="${paging}">${verses.map((n) => `<span data-verse="${n}">v${n}</span>`).join('')}</main>`;
    return document.querySelector('main') as HTMLElement;
  };
  it('is null where no Reader is drawn', () => {
    expect(verseOnTop()).toBeNull();
  });
  it('is the first verse at or below the top of a scrolled box', () => {
    const box = draw('scroll', [27, 28, 29]);
    box.scrollTop = 500;
    box.getBoundingClientRect = () => ({ top: 100, left: 0, right: 390, bottom: 800 }) as DOMRect;
    const tops: Record<string, number> = { v27: 60, v28: 108, v29: 400 };
    box.querySelectorAll('span').forEach((el) => (el.getBoundingClientRect = () => ({ top: tops[el.textContent!]! }) as DOMRect));
    expect(verseOnTop()).toBe(28);
  });
  it('is null at the top of the chapter', () => {
    draw('scroll', [1, 2]);
    expect(verseOnTop()).toBeNull();
  });
  it('in Turn pages is the first verse that begins on the page showing', () => {
    const box = draw('pages', [27, 28, 29]);
    box.getBoundingClientRect = () => ({ top: 0, left: 0, right: 390, bottom: 800 }) as DOMRect;
    const lefts: Record<string, number> = { v27: -300, v28: 10, v29: 200 };
    box.querySelectorAll('span').forEach((el) => (el.getClientRects = () => [{ left: lefts[el.textContent!]!, width: 50 }] as unknown as DOMRectList));
    expect(verseOnTop()).toBe(28);
  });
});

describe('OpenInApp', () => {
  it('shows one labelled control in a Android browser tab where the API reports the app, and a tap goes to the same address through an intent: URL', async () => {
    const asked = setup();
    render(<OpenInApp />);
    const button = await screen.findByRole('button', { name: 'Open in the app' });
    expect(asked).toHaveBeenCalledTimes(1);
    expect(goTo).not.toHaveBeenCalled(); // no automatic redirect
    window.history.replaceState(null, '', '/#/?b=jhn&c=3&v=16'); // he read on before he tapped: the address at the tap is the one handed over
    fireEvent.click(button);
    expect(goTo).toHaveBeenCalledTimes(1);
    expect(goTo).toHaveBeenCalledWith(intentUrl(window.location.href));
    expect(goTo.mock.calls[0]![0]).toContain('#/?ref=John.3.16#Intent;');
  });

  it('shows nothing where the API reports nothing', async () => {
    const asked = setup({ apps: [] });
    render(<OpenInApp />);
    await waitFor(() => expect(asked).toHaveBeenCalled());
    await Promise.resolve();
    expect(control()).toBeNull();
  });

  it('shows nothing where the API reports only another app', async () => {
    const asked = setup({ apps: [{ platform: 'play', id: 'com.example.other' }] });
    render(<OpenInApp />);
    await waitFor(() => expect(asked).toHaveBeenCalled());
    await Promise.resolve();
    expect(control()).toBeNull();
  });

  it('shows nothing where the API is absent', async () => {
    setup({ apps: 'absent' });
    const { container } = render(<OpenInApp />);
    await Promise.resolve();
    expect(control()).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows nothing where the API rejects', async () => {
    const asked = setup();
    asked.mockRejectedValue(new Error('not allowed'));
    render(<OpenInApp />);
    await waitFor(() => expect(asked).toHaveBeenCalled());
    await Promise.resolve();
    expect(control()).toBeNull();
  });

  it('never shows inside the installed app, and does not even ask', async () => {
    const asked = setup({ standalone: true });
    render(<OpenInApp />);
    await Promise.resolve();
    expect(control()).toBeNull();
    expect(asked).not.toHaveBeenCalled();
  });

  it('shows nothing off Android: an intent: URL is Android Chrome\'s', async () => {
    const asked = setup({ ua: DESKTOP });
    render(<OpenInApp />);
    await Promise.resolve();
    expect(control()).toBeNull();
    expect(asked).not.toHaveBeenCalled();
  });

  it('is put away for the session by Not now, and stays away on the next draw', async () => {
    setup();
    const first = render(<OpenInApp />);
    await screen.findByRole('button', { name: 'Open in the app' });
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(control()).toBeNull();
    expect(goTo).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(DISMISSED_KEY)).toBe('1');
    first.unmount();
    const asked = setup();
    render(<OpenInApp />);
    await Promise.resolve();
    expect(control()).toBeNull();
    expect(asked).not.toHaveBeenCalled();
  });
});
