// A video sermon plays inside the app (mw-qtu3zvz.83, docs/sermons.md 'The player'): a YouTube row opens the IFrame player (youtube-nocookie.com) in a sheet over the reader, a Subsplash row its own embed player,
// and openSermon(row, { auto: true }) starts it with no tap; where the browser refuses, the sheet shows one big Play button. The YouTube IFrame API is a fake here (window.YT), as it is in the e2e spec.
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeSermon, dropQueuedSermon, hasQueuedSermon, openSermon as openSermonNow, playQueuedSermon, queueSermon, videoOfRow } from '../../src/sermons/player';
import { ASYNC_WAIT_MS as timeout } from '../support/timeouts';
import { SermonPlayerHost } from '../../src/sermons/SermonPlayer';
import { videoOf } from '../../src/sermons/video';
import { pageOfRow } from '../../src/sermons/playerPage';
import { SERMON_INDEX, type SermonBookFile } from '../../src/data/sermonIndex';
import { readFileSync } from 'node:fs';
import { db } from '../../src/data/db';
import { openWebSetting } from '../../src/settings/definitions/sermons';
import { setSetting } from '../../src/settings/store';
import type { LinkRow } from '../../src/sermons/merge';

const yt = (url: string, alt?: string): LinkRow => ({ id: 'a', source: 'brookfield', title: 'The Day of the Lord', open: { url }, opensIn: 'web', ...(alt ? { alt } : {}) });

/** openSermon, inside act: it draws the sheet. */
const openSermon = (...args: Parameters<typeof openSermonNow>): boolean => {
  let opened = false;
  act(() => {
    opened = openSermonNow(...args);
  });
  return opened;
};

type Events = { onReady?: (e: { target: Fake }) => void; onStateChange?: (e: { data: number }) => void; onAutoplayBlocked?: (e: object) => void };
let made: Fake[];
let behaviour: 'allow' | 'block' | 'silent';
class Fake {
  played = 0;
  destroyed = false;
  target: HTMLElement | string;
  opts: { host?: string; videoId?: string; playerVars?: Record<string, unknown>; events?: Events };
  constructor(target: HTMLElement | string, opts: { host?: string; videoId?: string; playerVars?: Record<string, unknown>; events?: Events }) {
    this.target = target;
    this.opts = opts;
    made.push(this);
    queueMicrotask(() => opts.events?.onReady?.({ target: this }));
  }
  playVideo() {
    this.played++;
    if (behaviour === 'allow') this.opts.events?.onStateChange?.({ data: 1 });
    if (behaviour === 'block') this.opts.events?.onAutoplayBlocked?.({});
  }
  destroy() {
    this.destroyed = true;
  }
}

beforeEach(() => {
  made = [];
  behaviour = 'allow';
  (window as unknown as { YT: unknown }).YT = { Player: Fake, PlayerState: { PLAYING: 1, BUFFERING: 3 } };
});
afterEach(() => {
  cleanup();
  act(() => closeSermon());
  delete (window as unknown as { YT?: unknown }).YT;
  vi.useRealTimers();
});

describe('videoOf: the address a video row plays from', () => {
  it('reads a YouTube watch, short, embed and mobile address', () => {
    for (const url of ['https://www.youtube.com/watch?v=abc_DEF-123', 'https://m.youtube.com/watch?v=abc_DEF-123&t=5', 'https://youtu.be/abc_DEF-123', 'https://www.youtube.com/embed/abc_DEF-123', 'https://www.youtube.com/live/abc_DEF-123']) {
      expect(videoOf(url), url).toEqual({ kind: 'youtube', id: 'abc_DEF-123' });
    }
  });
  it('makes the Subsplash embed address of a media page and of a church short link', () => {
    expect(videoOf('https://subsplash.com/u/brookfieldfirst/media/d/q59d572-the-day-of-the-lord')).toEqual({
      kind: 'subsplash',
      embed: 'https://subsplash.com/u/brookfieldfirst/media/embed/d/q59d572-the-day-of-the-lord',
      page: 'https://subsplash.com/u/brookfieldfirst/media/d/q59d572-the-day-of-the-lord',
    });
    expect(videoOf('https://brookfieldfirst.subspla.sh/q59d572')).toEqual({
      kind: 'subsplash',
      embed: 'https://subsplash.com/u/brookfieldfirst/media/embed/d/q59d572',
      page: 'https://subsplash.com/u/brookfieldfirst/media/d/q59d572',
    });
  });
  it('leaves a Subsplash page that is not one media item, a look-alike and a text page to the web', () => {
    for (const url of ['https://subsplash.com/u/brookfieldfirst/media', 'https://subsplash.com.evil.example/u/x/media/d/y', 'https://youtube.com.evil.example/watch?v=abc', 'https://www.youtube.com/@channel', 'https://www.youtube.com/watch?v=', 'https://ccel.org/ccel/spurgeon/sermons1.i.html', 'not a url']) {
      expect(videoOf(url), url).toBeUndefined();
    }
  });
});

describe('openSermon', () => {
  it('opens a YouTube row in a sheet with Close, the youtube-nocookie player, and starts nothing without auto', async () => {
    render(<SermonPlayerHost />);
    expect(openSermon(yt('https://www.youtube.com/watch?v=vid1_abcdEF'))).toBe(true);
    const sheet = await screen.findByRole('dialog', { name: 'The Day of the Lord' });
    expect(within(sheet).getByRole('button', { name: 'Close' })).toBeInTheDocument();
    await vi.waitFor(() => expect(made).toHaveLength(1), { timeout });
    expect(made[0].opts.host).toBe('https://www.youtube-nocookie.com');
    expect(made[0].opts.videoId).toBe('vid1_abcdEF');
    expect(made[0].played).toBe(0);
    expect(within(sheet).queryByRole('button', { name: 'Play' })).toBeNull();
  });

  it('with auto starts playback with no tap, and shows no Play button', async () => {
    render(<SermonPlayerHost />);
    openSermon(yt('https://www.youtube.com/watch?v=vid1_abcdEF'), { auto: true });
    await screen.findByRole('dialog', { name: 'The Day of the Lord' });
    await vi.waitFor(() => expect(made[0]?.played).toBe(1), { timeout });
    await act(async () => {});
    expect(screen.queryByRole('button', { name: 'Play' })).toBeNull();
  });

  it('when the browser refuses (autoplay blocked), shows one big Play button, and a tap on it plays', async () => {
    behaviour = 'block';
    const user = userEvent.setup();
    render(<SermonPlayerHost />);
    openSermon(yt('https://www.youtube.com/watch?v=vid1_abcdEF'), { auto: true });
    const play = await screen.findByRole('button', { name: 'Play' });
    expect(screen.getAllByRole('button', { name: 'Play' })).toHaveLength(1);
    expect(screen.getByRole('dialog', { name: 'The Day of the Lord' })).toBeInTheDocument();
    behaviour = 'allow';
    await user.click(play);
    expect(made[0].played).toBe(2);
    await vi.waitFor(() => expect(screen.queryByRole('button', { name: 'Play' })).toBeNull(), { timeout });
  });

  it('treats a play that never starts, in 3 seconds, as refused (a NotAllowedError that no event reported)', async () => {
    behaviour = 'silent';
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<SermonPlayerHost />);
    openSermon(yt('https://www.youtube.com/watch?v=vid1_abcdEF'), { auto: true });
    await screen.findByRole('dialog', { name: 'The Day of the Lord' });
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(screen.queryByRole('button', { name: 'Play' })).toBeNull();
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  it('opens a Subsplash row a tap chose in Subsplash\'s embed player, whose own Play button is the one tap', async () => {
    render(<SermonPlayerHost />);
    openSermon(yt('https://www.youtube.com/watch?v=vid1_abcdEF', 'https://brookfieldfirst.subspla.sh/q59d572'));
    const sheet = await screen.findByRole('dialog', { name: 'The Day of the Lord' });
    const frame = sheet.querySelector('iframe');
    expect(frame?.getAttribute('src')).toBe('https://subsplash.com/u/brookfieldfirst/media/embed/d/q59d572');
    expect(frame?.getAttribute('allow')).toContain('autoplay');
    expect(made).toHaveLength(0);
  });

  it('opens a Subsplash row Lampas starts itself (auto) on Subsplash\'s media page with ?autoplay, which plays with no tap (mw-qtu3zvz.282)', async () => {
    render(<SermonPlayerHost />);
    openSermon(yt('https://www.youtube.com/watch?v=vid1_abcdEF', 'https://brookfieldfirst.subspla.sh/q59d572'), { auto: true });
    const sheet = await screen.findByRole('dialog', { name: 'The Day of the Lord' });
    const frame = sheet.querySelector('iframe');
    expect(frame?.getAttribute('src')).toBe('https://subsplash.com/u/brookfieldfirst/media/d/q59d572?autoplay');
    expect(frame?.getAttribute('allow')).toContain('autoplay');
    expect(made).toHaveLength(0);
  });

  it('does nothing, and says so, for a row that is no video; the sheet is not drawn', () => {
    render(<SermonPlayerHost />);
    expect(openSermon(yt('https://ccel.org/ccel/spurgeon/sermons1.i.html'), { auto: true })).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Close takes the sheet and the player away', async () => {
    const user = userEvent.setup();
    render(<SermonPlayerHost />);
    openSermon(yt('https://www.youtube.com/watch?v=vid1_abcdEF'));
    await vi.waitFor(() => expect(made).toHaveLength(1), { timeout });
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(made[0].destroyed).toBe(true);
  });
});

describe('a held sermon (the tutor\'s play-sermon, mw-qtu3zvz.84)', () => {
  afterEach(() => dropQueuedSermon());

  it('is held until the answer is said, then starts with no tap, and is forgotten', async () => {
    render(<SermonPlayerHost />);
    expect(queueSermon(yt('https://www.youtube.com/watch?v=vid1_abcdEF'))).toBe(true);
    expect(screen.queryByRole('dialog')).toBeNull();
    let played = false;
    act(() => {
      played = playQueuedSermon();
    });
    expect(played).toBe(true);
    await screen.findByRole('dialog', { name: 'The Day of the Lord' });
    await vi.waitFor(() => expect(made[0]?.played).toBe(1), { timeout });
    expect(hasQueuedSermon()).toBe(false);
    expect(playQueuedSermon()).toBe(false);
  });

  it('holds nothing for a row that is no video, and plays nothing once dropped', () => {
    expect(queueSermon(yt('https://example.org/sermon.html'))).toBe(false);
    expect(hasQueuedSermon()).toBe(false);
    queueSermon(yt('https://www.youtube.com/watch?v=vid1_abcdEF'));
    dropQueuedSermon();
    expect(playQueuedSermon()).toBe(false);
  });
});

describe('the link back to the row\'s own page (mw-qtu3zvz.280.6)', () => {
  const PAGE = 'https://www.lifebibleministry.com/through-the-bible/isaiah/1';
  const lifebible = (): LinkRow => ({ id: 'isaiah.1', source: 'lifebible-ttb', title: 'Isaiah 1-4:1: God confronts the Kingdom of Judah', open: { url: PAGE }, opensIn: 'web', alt: 'https://www.youtube.com/watch?v=ynUYAm1-W6k' });

  it('shows \'Open on lifebibleministry.com ›\' under the video of a row whose page is not the video it plays', async () => {
    render(<SermonPlayerHost />);
    openSermon(lifebible());
    const sheet = await screen.findByRole('dialog', { name: 'Isaiah 1-4:1: God confronts the Kingdom of Judah' });
    const link = within(sheet).getByRole('link', { name: 'Open on lifebibleministry.com ›' });
    expect(link).toHaveAttribute('href', PAGE);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('is the Firefox intent, the page its fallback, where he chose Firefox on Android', async () => {
    const ANDROID = 'Mozilla/5.0 (Linux; Android 16; SM-S938B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ANDROID);
    await setSetting(openWebSetting, 'firefox');
    render(<SermonPlayerHost />);
    openSermon(lifebible());
    const link = await screen.findByRole('link', { name: 'Open on lifebibleministry.com ›' });
    await waitFor(() => expect(link.getAttribute('href')).toMatch(/^intent:\/\//), { timeout });
    expect(link).toHaveAttribute('href', `intent://www.lifebibleministry.com/through-the-bible/isaiah/1#Intent;scheme=https;package=org.mozilla.firefox;S.browser_fallback_url=${encodeURIComponent(PAGE)};end`);
    expect(link).not.toHaveAttribute('target');
    await db.settings.clear();
    vi.restoreAllMocks();
  });

  it('shows no such link for a row whose url is itself the video it plays', async () => {
    render(<SermonPlayerHost />);
    openSermon(yt('https://www.youtube.com/watch?v=vid1_abcdEF'));
    const sheet = await screen.findByRole('dialog', { name: 'The Day of the Lord' });
    expect(within(sheet).queryByRole('link')).toBeNull();
    expect(sheet.textContent).not.toContain('Open on');
  });

  it('names the page of a row that plays on Subsplash by its alt, and nothing for a row that is the Subsplash page itself', async () => {
    render(<SermonPlayerHost />);
    openSermon(yt('https://brookfield.example.org/sermons/1', 'https://brookfieldfirst.subspla.sh/q59d572'));
    const sheet = await screen.findByRole('dialog', { name: 'The Day of the Lord' });
    expect(within(sheet).getByRole('link', { name: 'Open on brookfield.example.org ›' })).toHaveAttribute('href', 'https://brookfield.example.org/sermons/1');
    act(() => closeSermon());
    openSermon(yt('https://subsplash.com/u/brookfieldfirst/media/d/q59d572'));
    const again = await screen.findByRole('dialog', { name: 'The Day of the Lord' });
    expect(within(again).queryByRole('link')).toBeNull();
  });
});

describe('the sweep: every bundled row the player plays (mw-qtu3zvz.280.6)', () => {
  it('gets the link exactly where its url is not the video it plays, and the link is its url with the host named', () => {
    const covered = new Map<string, { plays: number; linked: number }>();
    for (const entry of SERMON_INDEX.sources) {
      if (entry.kind !== 'sermons') continue;
      for (const book of entry.books ?? []) {
        let file: SermonBookFile;
        try {
          file = JSON.parse(readFileSync(`public/sermons/${entry.id}/${book}.json`, 'utf8')) as SermonBookFile;
        } catch {
          continue;
        }
        for (const r of file.rows) {
          const row: LinkRow = { id: r.id, source: entry.id, title: r.title, open: { url: r.url }, opensIn: r.url.startsWith('https://ref.ly/') ? 'logos' : 'web', ...(r.alt ? { alt: r.alt } : {}) };
          const video = videoOfRow(row);
          if (video === undefined) {
            expect(pageOfRow(row, undefined), `${entry.id}/${r.id} plays nothing`).toBeUndefined();
            continue;
          }
          const tally = covered.get(entry.id) ?? { plays: 0, linked: 0 };
          tally.plays++;
          const own = videoOf(r.url);
          const same = own !== undefined && JSON.stringify(own) === JSON.stringify(video);
          const page = pageOfRow(row, video);
          expect(page, `${entry.id}/${r.id}`).toBe(same ? undefined : r.url);
          if (page !== undefined) tally.linked++;
          covered.set(entry.id, tally);
        }
      }
    }
    // the sources that play here include lifebible-ttb, whose every row is linked back
    const lifebible = covered.get('lifebible-ttb');
    expect(lifebible?.plays).toBeGreaterThan(900);
    expect(lifebible?.linked).toBe(lifebible?.plays);
  });
});
