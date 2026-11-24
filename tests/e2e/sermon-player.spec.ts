// tests/e2e/sermon-player.spec.ts — the player sheet links back to the row's own page (mw-qtu3zvz.280.6, docs/sermons.md 'The player') at 390x844: with Life Bible Ministry's Through the Bible On, the Isaiah 1-4:1 row plays the
// YouTube video its page shows (the IFrame API is a fake script, as in tests/e2e/sermons.spec.ts: no request goes to YouTube) and the sheet has 'Open on lifebibleministry.com ›' under the video, the page's own address.
import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { keepSettings } from './keep-settings';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

test.use({ viewport: { width: 390, height: 844 } });

const SERVICE = 'https://sermons.allmymind.org';
const PAGE = 'https://www.lifebibleministry.com/through-the-bible/isaiah/1';
const FAKE_YOUTUBE = `
window.YT = { PlayerState: { PLAYING: 1, BUFFERING: 3 }, Player: class {
  constructor(target, opts) {
    this.opts = opts;
    const box = document.createElement('iframe');
    box.setAttribute('data-fake-youtube', opts.videoId);
    box.setAttribute('src', 'about:blank');
    target.appendChild(box);
    setTimeout(() => opts.events.onReady({ target: this }), 0);
  }
  playVideo() { this.opts.events.onStateChange({ data: 1 }); }
  destroy() {}
} };
window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady();
`;

test('Isaiah 1 with Life Bible Ministry On: tapping its row plays the YouTube talk, and the sheet links back to lifebibleministry.com (mw-qtu3zvz.280.6)', async ({ page }) => {
  await openUnlocked(page);
  await page.route(`${SERVICE}/**`, (route) => route.abort());
  await page.route('https://www.youtube.com/iframe_api', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: FAKE_YOUTUBE }));
  await page.goto('/#/?b=isa&c=1');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await keepSettings(page, { 'sermons.lifebible-ttb': 'on' });
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  const view = await openVerseView(page, 1);
  await view.getByRole('button', { name: /^Sermons · \d+$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Sermons for Isaiah 1:1' });
  const row = sheet.locator('a[data-sermon-row]').filter({ hasText: 'Isaiah 1-4:1: God confronts the Kingdom of Judah' });
  await expect(row).toHaveCount(1);
  await expect(row.locator('[data-sermon-meta]')).toContainText('Plays here');
  await row.click();
  const player = page.getByRole('dialog', { name: 'Isaiah 1-4:1: God confronts the Kingdom of Judah' });
  await expect(player.locator('[data-fake-youtube="ynUYAm1-W6k"]')).toBeVisible();
  const link = player.getByRole('link', { name: 'Open on lifebibleministry.com ›' });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', PAGE);
  await expect(link).toHaveAttribute('target', '_blank');
  // under the video, a 44 px tap, inside the screen
  const video = (await player.locator('[data-sermon-video]').boundingBox())!;
  const box = (await link.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(video.y + video.height);
  expect(box.height).toBeGreaterThanOrEqual(43.5);
  expect(box.x + box.width).toBeLessThanOrEqual(390.5);
  await shot(page, 'sermon-player-page-link');
});
