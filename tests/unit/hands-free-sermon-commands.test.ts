// Hands-free drives the sermon reader and the sermon player (mw-ecpivg5.3): 'pause', 'play' / 'resume', 'back', 'forward', 'restart' and 'stop' act on whichever sermon sheet is open, and on the Bible reading as before
// when neither is (src/handsFree/commands.ts, playback.ts; the sheets register their controls in src/sermons/voiceControls.ts). The real reader and player sheets are drawn; the speech engine is voice-kit's honest
// fake and the YouTube IFrame API a fake window.YT (as tests/unit/sermon-player.test.tsx has it); runCommand is called with the words the recogniser would hand it.
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { route } from 'voice-kit/handsfree';
import { clearBus } from '../../src/events/bus';
import { HELP_LINES, NOT_UNDERSTOOD, NO_SERMON_CONTROL, NO_SERMON_OPEN, OPEN_A_CHAPTER, runCommand, SPOKEN_COMMANDS } from '../../src/handsFree/commands';
import { forgetPlayback, goOnAtClose, silenceAtWake } from '../../src/handsFree/playback';
import type { LinkRow } from '../../src/sermons/merge';
import { closeSermon, openSermon } from '../../src/sermons/player';
import { SermonPlayerHost } from '../../src/sermons/SermonPlayer';
import { SermonReaderHost } from '../../src/sermons/SermonReader';
import { closeSermonText, openSermonText } from '../../src/sermons/sermonText';
import { SKIP_SECONDS } from '../../src/sermons/voiceControls';
import { setSermonsUrl } from '../../src/services/sermons';
import { getReading, stopReading } from '../../src/speech/readAloud';
import { ENGLISH_VOICE, stubSpeech } from '../support/fake-speech';
import { ASYNC_WAIT_MS as timeout } from '../support/timeouts';

const WEB = 'https://ccel.org/ccel/spurgeon/sermons06.xxiv.html';
const textRow: LinkRow = { id: '311', source: 'spurgeon-ccel', title: 'The Beginning, Increase, and End of the Divine Life', open: { url: WEB }, opensIn: 'web' };
const PARAGRAPHS = ['Dear friends, we begin.', 'Then the work increases.', 'And at last it ends.'];
const TEXT = { id: '311', title: 'The Beginning, Increase, and End', source: 'spurgeon-ccel', url: WEB, paragraphs: PARAGRAPHS };
const videoRow = (url: string): LinkRow => ({ id: 'a', source: 'brookfield', title: 'The Day of the Lord', open: { url }, opensIn: 'web' });

let spoken: string[];
const say = (text: string): Promise<void> => {
  spoken.push(text);
  return Promise.resolve();
};
const hear = (words: string) => runCommand(words, say);

class FakeVideo {
  calls: string[] = [];
  time = 100;
  /** The player's own report of its state (YT.PlayerState: 1 playing, 2 paused), as the real IFrame player sends it. */
  onState?: (e: { data: number }) => void;
  constructor(_target: unknown, opts: { events?: { onReady?: (e: { target: FakeVideo }) => void; onStateChange?: (e: { data: number }) => void } }) {
    this.onState = opts.events?.onStateChange;
    videos.push(this);
    queueMicrotask(() => opts.events?.onReady?.({ target: this }));
  }
  playVideo() {
    this.calls.push('play');
    this.onState?.({ data: 1 });
  }
  pauseVideo() {
    this.calls.push('pause');
    this.onState?.({ data: 2 });
  }
  stopVideo() {
    this.calls.push('stop');
    this.onState?.({ data: 0 });
  }
  seekTo(seconds: number) {
    this.calls.push(`seek ${seconds}`);
    this.time = seconds;
  }
  getCurrentTime() {
    return this.time;
  }
  destroy() {}
}
let videos: FakeVideo[];

beforeEach(() => {
  localStorage.clear();
  clearBus();
  forgetPlayback();
  spoken = [];
  videos = [];
  stubSpeech([ENGLISH_VOICE]);
  setSermonsUrl('https://sermons.test');
  (window as unknown as { YT: unknown }).YT = { Player: FakeVideo };
  vi.stubGlobal('fetch', () => Promise.resolve(new Response(JSON.stringify(TEXT), { status: 200, headers: { 'Content-Type': 'application/json' } })));
});
afterEach(() => {
  cleanup();
  act(() => {
    closeSermon();
    closeSermonText();
    stopReading();
  });
  forgetPlayback();
  delete (window as unknown as { YT?: unknown }).YT;
  vi.unstubAllGlobals();
});

/** The reader is open and reading its first paragraph. */
async function openReader(): Promise<void> {
  render(createElement(SermonReaderHost));
  await act(async () => {
    openSermonText(textRow);
  });
  await screen.findByRole('heading', { name: TEXT.title }, { timeout });
  await vi.waitFor(() => expect(getReading().status).toBe('reading'), { timeout });
}
/** The player is open on a YouTube video, ready. */
async function openPlayer(url = 'https://www.youtube.com/watch?v=abc_DEF-123'): Promise<FakeVideo> {
  render(createElement(SermonPlayerHost));
  act(() => {
    openSermon(videoRow(url));
  });
  await vi.waitFor(() => expect(videos.length).toBe(1), { timeout });
  await act(async () => {});
  return videos[0];
}
const verse = () => getReading().verse;

describe('the grammar', () => {
  it("takes 'restart', 'back' and 'forward' as commands, each with a help line", () => {
    for (const words of ['restart', 'start over', 'back', 'go back', 'forward', 'go forward', 'skip']) expect(route(words, SPOKEN_COMMANDS), words).not.toBeNull();
    expect(route('restart', SPOKEN_COMMANDS)?.name).toBe('restart');
    expect(route('back', SPOKEN_COMMANDS)?.name).toBe('back');
    expect(route('forward', SPOKEN_COMMANDS)?.name).toBe('forward');
    expect(HELP_LINES.map((line) => line.name)).toEqual(expect.arrayContaining(['restart', 'back', 'forward']));
  });
  it("leaves 'back a verse' and 'back a chapter' to their own commands", () => {
    expect(route('back a verse', SPOKEN_COMMANDS)?.name).toBe('back-verse');
    expect(route('back a chapter', SPOKEN_COMMANDS)?.name).toBe('previous-chapter');
  });
});

describe('the sermon reader is open', () => {
  it("'pause' pauses it and 'play', 'resume' and 'continue' go on", async () => {
    await openReader();
    await act(() => hear('pause'));
    expect(getReading().status).toBe('paused');
    await act(() => hear('play'));
    expect(getReading().status).toBe('reading');
    await act(() => hear('pause'));
    await act(() => hear('resume'));
    expect(getReading().status).toBe('reading');
    await act(() => hear('pause'));
    await act(() => hear('continue'));
    expect(getReading().status).toBe('reading');
    expect(spoken).toEqual([]);
  });

  it("'forward' reads the next paragraph and 'back' the one before, paused or not", async () => {
    await openReader();
    expect(verse()).toBe(1);
    await act(() => hear('forward'));
    expect(verse()).toBe(2);
    expect(getReading().status).toBe('reading');
    await act(() => hear('forward'));
    expect(verse()).toBe(3);
    await act(() => hear('back'));
    expect(verse()).toBe(2);
    expect(spoken).toEqual([]);
  });

  it("'restart' reads from the first paragraph", async () => {
    await openReader();
    await act(() => hear('forward'));
    await act(() => hear('forward'));
    expect(verse()).toBe(3);
    await act(() => hear('restart'));
    expect(verse()).toBe(1);
    expect(getReading().status).toBe('reading');
  });

  it("'stop' ends the reading, and 'play' starts it again from where it stopped", async () => {
    await openReader();
    await act(() => hear('forward'));
    await act(() => hear('stop'));
    expect(getReading().status).toBe('idle');
    await act(() => hear('play'));
    expect(getReading().status).toBe('reading');
    expect(verse()).toBe(2);
    expect(spoken).toEqual([]);
  });

  it('after the wake paused it, play goes on and pause stays paused, and the close does not undo either', async () => {
    await openReader();
    act(() => silenceAtWake());
    expect(getReading().status).toBe('paused');
    await act(() => hear('pause'));
    act(() => goOnAtClose());
    expect(getReading().status).toBe('paused');
    act(() => silenceAtWake());
    await act(() => hear('play'));
    act(() => goOnAtClose());
    expect(getReading().status).toBe('reading');
  });

  it('does not read a Bible chapter for play while it is open', async () => {
    await openReader();
    await act(() => hear('stop'));
    await act(() => hear('play'));
    expect(spoken).not.toContain(OPEN_A_CHAPTER);
    expect(getReading().answer).not.toBeNull();
  });
});

describe('the sermon player is open', () => {
  it("'pause' pauses the video and 'play', 'resume' play it", async () => {
    const video = await openPlayer();
    await act(() => hear('pause'));
    await act(() => hear('play'));
    await act(() => hear('resume'));
    expect(video.calls).toEqual(['pause', 'play', 'play']);
    expect(spoken).toEqual([]);
  });

  it("'forward' and 'back' move it 30 seconds, and never before the start", async () => {
    const video = await openPlayer();
    expect(SKIP_SECONDS).toBe(30);
    await act(() => hear('forward'));
    expect(video.time).toBe(130);
    await act(() => hear('back'));
    expect(video.time).toBe(100);
    video.time = 10;
    await act(() => hear('back'));
    expect(video.time).toBe(0);
  });

  it("'restart' plays it from 0 and 'stop' stops it", async () => {
    const video = await openPlayer();
    await act(() => hear('restart'));
    expect(video.calls).toEqual(['seek 0', 'play']);
    await act(() => hear('stop'));
    expect(video.calls.at(-1)).toBe('stop');
  });

  it('the wake pauses a playing video so the microphone does not hear it, and the close plays it again', async () => {
    const video = await openPlayer();
    await act(() => hear('play'));
    video.calls.length = 0;
    act(() => silenceAtWake());
    expect(video.calls).toEqual(['pause']);
    act(() => goOnAtClose());
    expect(video.calls).toEqual(['pause', 'play']);
  });

  it('the wake leaves a video that is not playing alone, and the close does not start it', async () => {
    const video = await openPlayer();
    act(() => silenceAtWake());
    act(() => goOnAtClose());
    expect(video.calls).toEqual([]);
    await act(() => hear('play'));
    await act(() => hear('pause'));
    video.calls.length = 0;
    act(() => silenceAtWake());
    act(() => goOnAtClose());
    expect(video.calls).toEqual([]);
  });

  it("after the wake paused it, 'pause' keeps it paused and 'play' plays it once, and the close undoes neither", async () => {
    const video = await openPlayer();
    await act(() => hear('play'));
    act(() => silenceAtWake());
    await act(() => hear('pause'));
    act(() => goOnAtClose());
    expect(video.calls).toEqual(['play', 'pause', 'pause']);
    await act(() => hear('play'));
    video.calls.length = 0;
    act(() => silenceAtWake());
    await act(() => hear('play'));
    act(() => goOnAtClose());
    expect(video.calls).toEqual(['pause', 'play']);
  });

  it("the close does not play a video the wake paused when he closed the player meanwhile, or the page is hidden", async () => {
    const video = await openPlayer();
    await act(() => hear('play'));
    act(() => silenceAtWake());
    act(() => closeSermon());
    video.calls.length = 0;
    act(() => goOnAtClose());
    expect(video.calls).toEqual([]);
    const second = await openPlayer('https://www.youtube.com/watch?v=zzz_DEF-123');
    await act(() => hear('play'));
    act(() => silenceAtWake());
    const hidden = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    second.calls.length = 0;
    act(() => goOnAtClose());
    hidden.mockRestore();
    expect(second.calls).toEqual([]);
  });

  it('a Subsplash video has no controls to call: it says so', async () => {
    render(createElement(SermonPlayerHost));
    act(() => {
      openSermon(videoRow('https://subsplash.com/u/brookfieldfirst/media/d/q59d572-the-day-of-the-lord'));
    });
    await act(() => hear('pause'));
    expect(spoken).toEqual([NO_SERMON_CONTROL]);
  });

  it('with the reader over the player, the reader is the one driven', async () => {
    const video = await openPlayer();
    render(createElement(SermonReaderHost));
    await act(async () => {
      openSermonText(textRow);
    });
    await screen.findByRole('heading', { name: TEXT.title }, { timeout });
    await vi.waitFor(() => expect(getReading().status).toBe('reading'), { timeout });
    await act(() => hear('pause'));
    expect(getReading().status).toBe('paused');
    expect(video.calls).toEqual([]);
  });
});

describe('neither is open', () => {
  it("'play' with no chapter open says what it said before", async () => {
    await hear('play');
    expect(spoken).toEqual([OPEN_A_CHAPTER]);
  });
  it("'back', 'forward' and 'restart' say no sermon is open", async () => {
    for (const words of ['back', 'forward', 'restart']) await hear(words);
    expect(spoken).toEqual([NO_SERMON_OPEN, NO_SERMON_OPEN, NO_SERMON_OPEN]);
  });
  it("'pause' and 'stop' end a Bible reading as before", async () => {
    await hear('pause');
    await hear('stop');
    expect(spoken).toEqual([]);
    expect(spoken).not.toContain(NOT_UNDERSTOOD);
  });
});
