// tests/unit/open-in-app.test.tsx — 'Open in the app' (mw-5r3p30.1041, mw-5r3p30.1082): in a Chrome tab on Android where navigator.getInstalledRelatedApps names the installed
// Lampas, one labelled control hands the same address (a plain https address, not an intent: URL: Chromium keeps an intent: URL for the browser's own host in Chrome, as a
// 'navigation to self') to Android in a new tab with no referrer. Not where the API is absent or reports nothing, not in the installed app, not once dismissed for the
// session, and nothing leaves the page but his tap.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const goTo = vi.hoisted(() => vi.fn());
vi.mock('../../src/openInApp', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../src/openInApp')>()), goTo }));
const realGoTo = async () => (await vi.importActual<typeof import('../../src/openInApp')>('../../src/openInApp')).goTo;

import { OpenInApp } from '../../src/OpenInApp';
import { DISMISSED_KEY, handedHref, handOverHref, verseOnTop } from '../../src/openInApp';
import { oneTap, SETTLE_MS, settle } from '../../src/ui/settle';
import { bringVerse, pendingRequest, takeRequest } from '../../src/nav/readerRequest';
import { linkOf } from '../../src/nav/links';
import { readerOf } from '../../src/nav/route';

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const DESKTOP = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

function setup({ ua = ANDROID, standalone = false, modes = [], apps }: { ua?: string; standalone?: boolean; modes?: string[]; apps?: unknown[] | 'absent' } = {}) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: (standalone && /standalone/.test(query)) || modes.some((mode) => query.includes(`display-mode: ${mode}`)), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
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

describe('the address the tap hands over', () => {
  it('is the same address, with the verse in a form a fresh app opens at, and no intent: wrapper', () => {
    expect(handedHref(`${ORIGIN}/#/?b=rom&c=8&v=28`)).toBe(`${ORIGIN}/#/?ref=Rom.8.28`);
  });
  it('puts the verse at the top of the box in an address that has none', () => {
    expect(handedHref(`${ORIGIN}/#/?b=rom&c=8&view=english&weave=off`, 28)).toBe(`${ORIGIN}/#/?ref=Rom.8.28&view=english&weave=off`);
  });
  it('keeps a port and a plain http scheme, for a preview', () => {
    expect(handedHref('http://localhost:4173/#/words')).toBe('http://localhost:4173/#/words');
  });
});

// mw-5r3p30.1082: on his phone the intent: URL stayed in Chrome (Chromium's isNavigationToSelf: the default handler of an https address of the app is the browser). goTo opens the address
// in a NEW tab with no opener and no referrer, so that Chromium's same-host rule (shouldStayWithinHost) has no earlier same-host page to compare it with.
describe('goTo', () => {
  afterEach(() => void (document.body.innerHTML = ''));
  it('opens the address in a new tab, with no opener and no referrer, from his tap', async () => {
    const goToReal = await realGoTo();
    const seen: { href: string; target: string; rel: string; referrerPolicy: string }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      seen.push({ href: this.href, target: this.target, rel: this.rel, referrerPolicy: this.referrerPolicy });
    });
    goToReal(`${ORIGIN}/#/?ref=John.5.25`);
    expect(seen).toEqual([{ href: `${ORIGIN}/#/?ref=John.5.25`, target: '_blank', rel: 'noopener noreferrer', referrerPolicy: 'no-referrer' }]);
    expect(document.querySelector('a'), 'the link is taken away again').toBeNull();
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
    });
  }
  it.each(['#/words', '#/settings?setting=x', '#/?word=G3551', '#/', '#/memorize/Rom.8.28/en'])('hands %s as it is: it is no place in a chapter, or already a link', (address) => {
    expect(handedHref(`${ORIGIN}/${address}`, 5)).toBe(`${ORIGIN}/${address}`);
  });
});

// mw-5r3p30.1066: the verse a ref= link names is not in the Reader's address (LinkOpener rewrote it to the plain chapter) and the box cannot answer verseOnTop until the chapter's
// verses are drawn. The request LinkOpener made (bringVerse) is still waiting then, and it names the verse: one case per moment the box cannot answer.
describe('handOverHref: the verse the link named, before the box can say', () => {
  afterEach(() => {
    const waiting = pendingRequest();
    if (waiting) takeRequest(waiting);
    document.body.innerHTML = '';
  });
  const at = (hash: string) => window.history.replaceState(null, '', `/${hash}`);
  const READER = '#/?b=rom&c=8&view=english&weave=off';
  const drawn = (verses: number[], tops: Record<number, number> = {}) => {
    document.body.innerHTML = `<main data-reader data-paging="scroll">${verses.map((n) => `<span data-verse="${n}">v${n}</span>`).join('')}</main>`;
    const box = document.querySelector('main') as HTMLElement;
    box.scrollTop = 500;
    box.getBoundingClientRect = () => ({ top: 100, left: 0, right: 390, bottom: 800 }) as DOMRect;
    box.querySelectorAll('span').forEach((el) => (el.getBoundingClientRect = () => ({ top: tops[Number((el as HTMLElement).dataset.verse)] ?? 0 }) as DOMRect));
  };
  const handed = () => new URL(handOverHref()).hash;

  it('while the chapter is loading (no box yet)', () => {
    at(READER);
    bringVerse('rom', 8, 28, { heading: true });
    expect(handed()).toBe('#/?ref=Rom.8.28&view=english&weave=off');
  });
  it('while the box is drawn but empty (the chapter is here, its verses are not)', () => {
    at(READER);
    document.body.innerHTML = '<main data-reader data-paging="scroll"></main>';
    bringVerse('rom', 8, 28);
    expect(handed()).toBe('#/?ref=Rom.8.28&view=english&weave=off');
  });
  it('at a chapter swap, when the box still holds the chapter before it', () => {
    at(READER);
    drawn([1, 2, 3, 4], { 3: 100 }); // the old chapter, scrolled to its verse 3
    bringVerse('rom', 8, 28);
    expect(handed()).toBe('#/?ref=Rom.8.28&view=english&weave=off');
  });
  it('when the chapter arrives after the strip was drawn (the request is met, verse 28 on top)', () => {
    at(READER);
    bringVerse('rom', 8, 28);
    drawn([27, 28, 29], { 27: 60, 28: 108, 29: 400 });
    takeRequest(pendingRequest()!);
    expect(handed()).toBe('#/?ref=Rom.8.28&view=english&weave=off');
  });
  it('once he has read on after it was met, the verse on top is what is handed', () => {
    at(READER);
    bringVerse('rom', 8, 28);
    takeRequest(pendingRequest()!);
    drawn([35, 36], { 35: 108, 36: 300 });
    expect(handed()).toBe('#/?ref=Rom.8.35&view=english&weave=off');
  });
  it('ignores a request for another chapter than the address', () => {
    at(READER);
    bringVerse('jhn', 3, 16);
    expect(handed()).toBe('#/?ref=Rom.8&view=english&weave=off');
  });
  it('lets a verse selected in the address win', () => {
    at('#/?b=rom&c=8&v=5');
    bringVerse('rom', 8, 28);
    expect(handed()).toBe('#/?ref=Rom.8.5');
  });
  it('OpenInApp hands the verse over when tapped while the chapter loads', async () => {
    setup();
    at(READER);
    bringVerse('rom', 8, 28, { heading: true });
    render(<OpenInApp />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open in the app' }));
    expect(goTo).toHaveBeenCalledWith(`${window.location.origin}/#/?ref=Rom.8.28&view=english&weave=off`);
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
  it('shows one labelled control in a Android browser tab where the API reports the app, and a tap goes to the same address, as a plain address and not an intent: URL', async () => {
    const asked = setup();
    render(<OpenInApp />);
    const button = await screen.findByRole('button', { name: 'Open in the app' });
    expect(asked).toHaveBeenCalledTimes(1);
    expect(goTo).not.toHaveBeenCalled(); // no automatic redirect
    window.history.replaceState(null, '', '/#/?b=jhn&c=3&v=16'); // he read on before he tapped: the address at the tap is the one handed over
    fireEvent.click(button);
    expect(goTo).toHaveBeenCalledTimes(1);
    expect(goTo).toHaveBeenCalledWith(handedHref(window.location.href));
    expect(goTo.mock.calls[0]![0]).toBe(`${window.location.origin}/#/?ref=John.3.16`);
    expect(goTo.mock.calls[0]![0]).not.toMatch(/^intent:/);
  });

  // mw-5r3p30.1093 (mw-5r3p30.1053, .1089): the second tap of a double tap sent a second hand-over (two new tabs, two asks of Android). tests/setup.ts turns the moment off.
  describe('a double tap', () => {
    const moment = settle.ms;
    // oneTap keeps the last tap for the whole page: each test stands on a clock of its own, long after any tap an earlier test made
    let epoch = 1_000_000;
    beforeEach(() => {
      settle.ms = SETTLE_MS;
      epoch += 1_000_000;
      vi.spyOn(performance, 'now').mockReturnValue(epoch);
    });
    afterEach(() => {
      settle.ms = moment;
      oneTap('another control', () => undefined); // the page's last tap is no longer this strip's, on a clock the next test does not share
    });
    it('hands the address over once for two quick taps', async () => {
      setup();
      render(<OpenInApp />);
      const button = await screen.findByRole('button', { name: 'Open in the app' });
      fireEvent.click(button);
      fireEvent.click(button);
      expect(goTo).toHaveBeenCalledTimes(1);
    });
    it('takes the next tap once the moment has passed (a tap that opened nothing is not locked out)', async () => {
      setup();
      render(<OpenInApp />);
      const button = await screen.findByRole('button', { name: 'Open in the app' });
      const now = vi.mocked(performance.now);
      fireEvent.click(button);
      now.mockReturnValue(epoch + SETTLE_MS + 1);
      fireEvent.click(button);
      expect(goTo).toHaveBeenCalledTimes(2);
    });
  });

  // mw-5r3p30.1091: on his phone the hand-over stayed in Chrome while Android's Supported web addresses switch for Lampas was off, and nothing told him. A tap the app took over from hides the
  // page (pagehide, visibilitychange to hidden); a page still showing 2 s after the tap was not taken over, and the strip says which switch to turn on.
  describe('a hand-over that does not leave the browser', () => {
    const HINT = "Lampas didn't open? On Android: Settings > Apps > Lampas > Set as default > Supported web addresses: turn on lampas.allmymind.org.";
    const hidden = (state: DocumentVisibilityState) => {
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);
      document.dispatchEvent(new Event('visibilitychange'));
    };
    afterEach(() => void vi.useRealTimers());
    const tapped = async () => {
      setup();
      render(<OpenInApp />);
      const button = await screen.findByRole('button', { name: 'Open in the app' });
      vi.useFakeTimers();
      fireEvent.click(button);
      return button;
    };
    it('says which switch to turn on when the page is still showing 2 s after the tap, and keeps Not now', async () => {
      await tapped();
      act(() => void vi.advanceTimersByTime(1999));
      expect(screen.queryByText(HINT)).toBeNull();
      act(() => void vi.advanceTimersByTime(1));
      expect(screen.getByText(HINT)).toBeTruthy();
      expect(control(), 'the hint stands in place of the control').toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
      expect(screen.queryByText(HINT)).toBeNull();
    });
    it('says nothing when the page was hidden within 2 s (the app took over)', async () => {
      await tapped();
      act(() => void vi.advanceTimersByTime(500));
      act(() => hidden('hidden'));
      act(() => void vi.advanceTimersByTime(5000));
      expect(screen.queryByText(HINT)).toBeNull();
    });
    it('says nothing when the page was left (pagehide) within 2 s', async () => {
      await tapped();
      act(() => void window.dispatchEvent(new Event('pagehide')));
      act(() => void vi.advanceTimersByTime(5000));
      expect(screen.queryByText(HINT)).toBeNull();
    });
    it('says nothing before any tap', async () => {
      setup();
      render(<OpenInApp />);
      await screen.findByRole('button', { name: 'Open in the app' });
      vi.useFakeTimers();
      act(() => void vi.advanceTimersByTime(10_000));
      expect(screen.queryByText(HINT)).toBeNull();
    });
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

  // mw-5r3p30.1090: a page tapped in another app (Postern) opens in a Chrome Custom Tab, which has its own minimal toolbar (header, X, three dots) and is no installed app. Chrome can
  // present it as display-mode minimal-ui (not found on a phone: the story's closing comment); the manifest's own display is standalone, so only that is the installed app's window.
  it('shows in a Chrome Custom Tab, which presents display-mode minimal-ui and is not the installed app', async () => {
    const asked = setup({ modes: ['minimal-ui'] });
    render(<OpenInApp />);
    const button = await screen.findByRole('button', { name: 'Open in the app' });
    expect(asked).toHaveBeenCalledTimes(1);
    fireEvent.click(button);
    expect(goTo).toHaveBeenCalledWith(handedHref(window.location.href)); // the same hand-over as in a Chrome tab
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
