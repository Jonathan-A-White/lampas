// mw-zbgo4ep.33: opening a chapter warms its book's recorded-voice timings (src/Reader.tsx) only when David could play: Recording (David), or Recording on Wi-Fi only on Wi-Fi
// (or a phone that does not say). On mobile data with Wi-Fi only on, David will not play and the small file is not fetched once the one question about data is answered (before it, the first Play needs the timings to offer David); on the Phone voice never.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { forgetChapters } from '../../src/data/chapter';
import { forgetTimings, timingsIndexUrl } from '../../src/data/audioTimings';
import { db } from '../../src/data/db';
import { bibleVoiceSetting } from '../../src/settings/definitions';
import { setConnectionForTests, type ConnectionLike } from '../../src/speech/connection';
import { resetRecordedVoice } from '../../src/speech/recordedVoice';
import { forgetVoiceNotices, markDataQuestionAnswered } from '../../src/speech/voiceDecision';
import { stubChapterFetch, type ChapterFetch } from '../support/chapter-fetch';

let stub: ChapterFetch;
beforeEach(async () => {
  cleanup();
  forgetVoiceNotices();
  await db.settings.clear();
  forgetTimings();
  stub = stubChapterFetch();
});
afterEach(() => {
  cleanup();
  setConnectionForTests(undefined);
  forgetVoiceNotices();
  resetRecordedVoice();
  vi.unstubAllGlobals();
  forgetChapters();
  forgetTimings();
});

/** Opens John 3 with this Bible voice saved and this connection; waits for the chapter to be drawn and the Reader's effects to have run. */
async function openJohn3(voice: string, connection: ConnectionLike | null | undefined): Promise<void> {
  await db.settings.put({ key: bibleVoiceSetting.key, value: voice });
  setConnectionForTests(connection);
  window.location.hash = '#/?b=jhn&c=3';
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await new Promise((resolve) => setTimeout(resolve, 300)); // a real-time wait: a window in which a request must NOT be made, so there is no condition to wait on
}

const timingsRequests = () => stub.requests.filter((url) => url.startsWith('/data/audio/'));

describe('opening a chapter warms the book timings only when David could play', () => {
  it('on mobile data with Recording on Wi-Fi only, once the question about data is answered, asks for no timings at all', async () => {
    markDataQuestionAnswered();
    await openJohn3('msb-david-wifi', { type: 'cellular' });
    expect(timingsRequests()).toEqual([]);
  });

  it('on mobile data with Recording on Wi-Fi only, while the question about data is still to be asked, warms them (the first Play offers David and needs them)', async () => {
    await openJohn3('msb-david-wifi', { type: 'cellular' });
    await waitFor(() => expect(timingsRequests()).toContain(timingsIndexUrl()));
  });

  it('on Wi-Fi with Recording on Wi-Fi only, warms them (the index first)', async () => {
    await openJohn3('msb-david-wifi', { type: 'wifi' });
    await waitFor(() => expect(timingsRequests()).toContain(timingsIndexUrl()));
  });

  it('on a phone that does not say its connection, warms them (it is taken for Wi-Fi)', async () => {
    await openJohn3('msb-david-wifi', null);
    await waitFor(() => expect(timingsRequests()).toContain(timingsIndexUrl()));
  });

  it('on mobile data with Recording (David), still warms them', async () => {
    await openJohn3('msb-david', { type: 'cellular' });
    await waitFor(() => expect(timingsRequests()).toContain(timingsIndexUrl()));
  });

  it('when the phone goes from mobile data to Wi-Fi, warms them then', async () => {
    const link = Object.assign(new EventTarget(), { type: 'cellular' });
    Object.defineProperty(navigator, 'connection', { value: link, configurable: true });
    markDataQuestionAnswered();
    try {
      await openJohn3('msb-david-wifi', undefined);
      expect(timingsRequests()).toEqual([]);
      link.type = 'wifi';
      act(() => {
        link.dispatchEvent(new Event('change'));
      });
      await waitFor(() => expect(timingsRequests()).toContain(timingsIndexUrl()));
    } finally {
      delete (navigator as unknown as { connection?: unknown }).connection;
    }
  });

  it('with the Phone voice, asks for none', async () => {
    await openJohn3('phone', { type: 'wifi' });
    expect(timingsRequests()).toEqual([]);
  });
});
