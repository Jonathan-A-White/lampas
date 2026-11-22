// A video sermon plays inside the app (mw-qtu3zvz.83, docs/sermons.md 'The player'): a YouTube row opens the IFrame player (youtube-nocookie.com) in a sheet over the reader, a Subsplash row its own embed player,
// and openSermon(row, { auto: true }) starts it with no tap; where the browser refuses, the sheet shows one big Play button. The YouTube IFrame API is a fake here (window.YT), as it is in the e2e spec.
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeSermon, dropQueuedSermon, hasQueuedSermon, openSermon as openSermonNow, playQueuedSermon, queueSermon } from '../../src/sermons/player';
import { ASYNC_WAIT_MS as timeout } from '../support/timeouts';
import { SermonPlayerHost } from '../../src/sermons/SermonPlayer';
import { videoOf } from '../../src/sermons/video';
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
    expect(videoOf('https://subsplash.com/u/brookfieldfirst/media/d/q59d572-the-day-of-the-lord')).toEqual({ kind: 'subsplash', embed: 'https://subsplash.com/u/brookfieldfirst/media/embed/d/q59d572-the-day-of-the-lord' });
    expect(videoOf('https://brookfieldfirst.subspla.sh/q59d572')).toEqual({ kind: 'subsplash', embed: 'https://subsplash.com/u/brookfieldfirst/media/embed/d/q59d572' });
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

  it('plays a Subsplash row (its alt address) in Subsplash\'s own embed player', async () => {
    render(<SermonPlayerHost />);
    openSermon(yt('https://www.youtube.com/watch?v=vid1_abcdEF', 'https://brookfieldfirst.subspla.sh/q59d572'), { auto: true });
    const sheet = await screen.findByRole('dialog', { name: 'The Day of the Lord' });
    const frame = sheet.querySelector('iframe');
    expect(frame?.getAttribute('src')).toBe('https://subsplash.com/u/brookfieldfirst/media/embed/d/q59d572');
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
