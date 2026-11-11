// 'Open web sermons in' (mw-qtu3zvz.16, docs/sermons.md 'Open web sermons in'): Settings > Study resources > Sermons, This browser (default) or Firefox. With Firefox on Android a web
// sermon's link is an intent:// address for Firefox (src/sermons/openWeb.ts), with the plain https address as its browser_fallback_url; anywhere else, and for a Logos row, the link is as it was.
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { SermonsDoor } from '../../src/sermons/SermonsDoor';
import { SermonsHost } from '../../src/sermons/SermonsSheet';
import { closeSermons } from '../../src/sermons/openSermons';
import { isVideoAddress, opensNewTab, rowHref, webHref } from '../../src/sermons/openWeb';
import { openWebSetting } from '../../src/settings/definitions/sermons';
import { isTalkable, ROWS, rowOf } from '../../src/settings/rows';
import { getSetting, setSetting } from '../../src/settings/store';
import { forgetTestSermons, registerTestSermons } from '../support/test-sermons';

const ANDROID = 'Mozilla/5.0 (Linux; Android 16; SM-S938B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const DESKTOP = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const ADDR = 'https://sermons.test/testsermons/love?x=1&y=a b';
const INTENT = `intent://sermons.test/testsermons/love?x=1&y=a%20b#Intent;scheme=https;package=org.mozilla.firefox;S.browser_fallback_url=${encodeURIComponent('https://sermons.test/testsermons/love?x=1&y=a%20b')};end`;

beforeEach(async () => {
  await db.open();
  await db.settings.clear();
});

afterEach(() => {
  cleanup();
  closeSermons();
  forgetTestSermons();
  clearBus();
  vi.restoreAllMocks();
});

describe('the setting', () => {
  it('is in Settings > Study resources > Sermons as Open web sermons in: This browser (default) or Firefox', () => {
    expect(openWebSetting.section).toBe('sermons');
    expect(openWebSetting.label).toBe('Open web sermons in');
    expect(openWebSetting.default).toBe('browser');
    expect(openWebSetting.allowed).toMatchObject({
      kind: 'choice',
      values: [
        { value: 'browser', label: 'This browser' },
        { value: 'firefox', label: 'Firefox' },
      ],
    });
    expect(openWebSetting.hint).toMatch(/Android/);
    expect(isTalkable(openWebSetting.key)).toBe(false);
    expect(rowOf(openWebSetting.key)?.label).toBe('Open web sermons in');
    expect(ROWS.filter((r) => r.section === 'sermons').map((r) => r.key)).toContain(openWebSetting.key);
  });

  it('is This browser to start, and a saved Firefox is kept across a reload', async () => {
    expect(await getSetting(openWebSetting)).toBe('browser');
    await setSetting(openWebSetting, 'firefox');
    expect(await getSetting(openWebSetting)).toBe('firefox');
        expect(openWebSetting.parse('nonsense')).toBe('browser');
  });
});

describe('webHref', () => {
  it('turns an https address into a Firefox intent with the address as its fallback, on Android with Firefox chosen', () => {
    expect(webHref(ADDR, 'firefox', true)).toBe(INTENT);
    expect(webHref('https://ccel.org/ccel/spurgeon/sermons1.i.html#top', 'firefox', true)).toBe(
      `intent://ccel.org/ccel/spurgeon/sermons1.i.html#Intent;scheme=https;package=org.mozilla.firefox;S.browser_fallback_url=${encodeURIComponent('https://ccel.org/ccel/spurgeon/sermons1.i.html#top')};end`,
    );
  });

  it('leaves the address as it is with This browser chosen, or off Android', () => {
    expect(webHref(ADDR, 'browser', true)).toBe(ADDR);
    expect(webHref(ADDR, 'firefox', false)).toBe(ADDR);
    expect(webHref(ADDR, 'browser', false)).toBe(ADDR);
  });

  it('leaves an address that is not https as it is', () => {
    expect(webHref('logosres:logos-1;ref=bible:Ro5.8', 'firefox', true)).toBe('logosres:logos-1;ref=bible:Ro5.8');
    expect(webHref('http://x.test/a', 'firefox', true)).toBe('http://x.test/a');
  });
});

describe('a video address (mw-qtu3zvz.62): YouTube and Subsplash open as they are, Firefox is for text', () => {
  const VIDEOS = [
    'https://m.youtube.com/watch?v=x',
    'https://www.youtube.com/watch?v=x',
    'https://youtu.be/x',
    'https://brookfieldfirst.subspla.sh/abc',
    'https://subsplash.com/u/x/media/mi/y',
  ];
  const TEXTS = ['https://www.ccel.org/ccel/spurgeon/sermons1.i.html', 'https://youtube.com.evil.example/watch?v=x', 'https://notyoutube.com/watch?v=x', 'https://subsplash.com.evil.example/a', 'https://notsubsplash.com/a'];

  it.each(VIDEOS)('leaves %s as it is with Firefox chosen on Android', (url) => {
    expect(isVideoAddress(url)).toBe(true);
    expect(webHref(url, 'firefox', true)).toBe(url);
  });

  it('still turns a text address into the Firefox intent', () => {
    const ccel = 'https://www.ccel.org/ccel/spurgeon/sermons1.i.html';
    expect(webHref(ccel, 'firefox', true)).toBe(`intent://www.ccel.org/ccel/spurgeon/sermons1.i.html#Intent;scheme=https;package=org.mozilla.firefox;S.browser_fallback_url=${encodeURIComponent(ccel)};end`);
  });

  it.each(TEXTS)('counts the look-alike or text address %s as text', (url) => {
    expect(isVideoAddress(url)).toBe(false);
    expect(webHref(url, 'firefox', true)).toMatch(/^intent:\/\//);
  });

  it('is not a video when it is not an address', () => {
    expect(isVideoAddress('not a url')).toBe(false);
    expect(isVideoAddress('logosres:logos-1;ref=bible:Ro5.8')).toBe(false);
  });

  it('a video row opens as a plain https link in a new tab under Firefox on Android', () => {
    const row = { opensIn: 'web' as const, open: { url: 'https://m.youtube.com/watch?v=x' } };
    const href = rowHref(row, 'firefox', true);
    expect(href).toBe('https://m.youtube.com/watch?v=x');
    expect(opensNewTab(href)).toBe(true);
  });

  it('a video Tutor chip (a Subsplash row) opens as a plain https link in a new tab under Firefox on Android', () => {
    const row = { opensIn: 'web' as const, open: { url: 'https://brookfieldfirst.subspla.sh/abc' } };
    const href = rowHref(row, 'firefox', true);
    expect(href).toBe('https://brookfieldfirst.subspla.sh/abc');
    expect(opensNewTab(href)).toBe(true);
  });
});

describe('rowHref', () => {
  it('leaves a Logos row alone, even with Firefox chosen on Android', () => {
    const logos = { opensIn: 'logos' as const, open: { url: 'logosres:logos-1;ref=bible:Ro5.8', fallback: 'https://ref.ly/logosres/logos-1?ref=bible.Ro5.8' } };
    expect(rowHref(logos, 'firefox', true)).toBe('logosres:logos-1;ref=bible:Ro5.8');
    expect(rowHref({ ...logos, open: { url: 'https://ref.ly/x' } }, 'firefox', true)).toBe('https://ref.ly/x');
  });

  it('turns a web row’s address', () => {
    expect(rowHref({ opensIn: 'web', open: { url: ADDR } }, 'firefox', true)).toBe(INTENT);
  });
});

describe('the Sermons sheet', () => {
  beforeEach(() => registerTestSermons({ second: true }));
  const user = userEvent.setup();

  async function open() {
    render(
      <>
        <SermonsDoor place={{ book: 'rom', chapter: 5, from: 8, to: 8 }} />
        <SermonsHost />
      </>,
    );
    await user.click(await screen.findByRole('button', { name: /^Sermons · / }));
    return screen.findByRole('dialog', { name: /^Sermons for / });
  }
  const hrefs = (sheet: HTMLElement) => [...sheet.querySelectorAll<HTMLAnchorElement>('a[data-sermon-row]')].map((a) => a.getAttribute('href'));

  it('gives each web row the Firefox intent on Android with Firefox chosen, and sets no new tab', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ANDROID);
    await setSetting(openWebSetting, 'firefox');
    const sheet = await open();
    const rows = [...sheet.querySelectorAll<HTMLAnchorElement>('a[data-sermon-row]')];
    expect(rows.length).toBeGreaterThan(1);
    await waitFor(() => expect(hrefs(sheet).every((h) => h?.startsWith('intent://sermons.test/') && h.includes('package=org.mozilla.firefox') && h.includes('S.browser_fallback_url=https%3A%2F%2Fsermons.test%2F'))).toBe(true));
    // the credit link to the source's homepage goes the same way
    const credit = within(sheet).getAllByRole('link').find((a) => a.closest('[data-sermon-credit]'));
    expect(credit?.getAttribute('href')).toMatch(/^intent:\/\//);
  });

  it('gives the plain https address with This browser chosen', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ANDROID);
    const sheet = await open();
    expect(hrefs(sheet)[0]).toBe('https://sermons.test/testsermons/love');
  });

  it('gives the plain https address off Android even with Firefox chosen', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(DESKTOP);
    await setSetting(openWebSetting, 'firefox');
    const sheet = await open();
    await act(() => new Promise<void>((resolve) => setTimeout(resolve, 100)));
    expect(hrefs(sheet)[0]).toBe('https://sermons.test/testsermons/love');
  });
});
