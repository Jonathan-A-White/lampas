// tests/e2e/no-recording.ts — for a spec that listens to the phone's voice (mw-fnvjof.17.289). Bible voice starts on Recording on Wi-Fi only, and a headless Chromium
// does not say it is on mobile data, so a chapter David has timed (public/data/audio/msb-david/) is read by the recording, streamed from the real openbible.com, and the
// faked phone voice says nothing. With the timing files refused the book has no recording and the phone's voice reads it. Call it before the first page.goto; a spec about
// the recording stubs those files itself (tests/e2e/recorded-voice.spec.ts).
import type { Page } from '@playwright/test';

export const noRecording = async (page: Page): Promise<void> => {
  await page.route('**/data/audio/**', (route) => route.abort());
};
