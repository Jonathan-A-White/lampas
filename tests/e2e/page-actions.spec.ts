// Read aloud and Share in the header of a page of prose (mw-5r3p30.128) at phone width: both buttons are 44 px, fit the header beside the
// back button and the title on About, My study way and the Preface, and the line being read is marked and kept in view. Speech is bsv-kit's
// honest fake (tests/support/honest-fakes.ts); how a real voice sounds is only a phone check (docs/pwa-best-practices.md section 12).
import { expect, test, type Page } from '@playwright/test';
import { honestSpeech } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const PAGES = [
  { hash: '#/about', title: 'About' },
  { hash: '#/studyway', title: 'My study way' },
  { hash: '#/preface', title: 'Preface' },
];

async function openPage(page: Page, hash: string, title: string) {
  await honestSpeech(page, { msPerWord: 300 });
  await openUnlocked(page);
  await page.goto(`/${hash}`);
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
}

for (const { hash, title } of PAGES) {
  test(`${title}: Read aloud and Share are thumb-sized and fit the header`, async ({ page }) => {
    await openPage(page, hash, title);
    const header = page.getByRole('banner');
    const read = header.getByRole('button', { name: 'Read aloud', exact: true });
    const share = header.getByRole('button', { name: 'Share', exact: true });
    for (const button of [read, share]) {
      const box = await button.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(43.5);
      expect(box?.height).toBeGreaterThanOrEqual(43.5);
    }
    // nothing in the header runs past the screen or over the title
    const [back, heading, readBox] = await Promise.all([
      header.getByRole('button').first().boundingBox(),
      header.getByRole('heading', { level: 1 }).boundingBox(),
      read.boundingBox(),
    ]);
    const shareBox = await share.boundingBox();
    expect(shareBox && shareBox.x + shareBox.width).toBeLessThanOrEqual(390);
    expect(back && heading && back.x + back.width).toBeLessThanOrEqual(heading?.x ?? 0);
    expect(heading && readBox && heading.x + heading.width).toBeLessThanOrEqual((readBox?.x ?? 0) + 0.5);
    if (title === 'Preface') await shot(page, 'page-actions');
  });
}

test('About: Read aloud marks the line being read and Pause is on the speaking bar', async ({ page }) => {
  await openPage(page, '#/about', 'About');
  await page.getByRole('banner').getByRole('button', { name: 'Read aloud', exact: true }).click();
  const bar = page.getByRole('region', { name: 'Speaking' });
  await expect(bar.getByRole('button', { name: 'Pause' })).toBeVisible();
  const marked = page.locator('[data-reading]');
  await expect(marked).toHaveCount(1);
  await expect(marked).toBeInViewport();
  await expect(marked).toContainText('If I have seen further');
  await bar.getByRole('button', { name: 'Pause' }).click();
  await expect(bar.getByRole('button', { name: 'Resume' })).toBeVisible();
  await shot(page, 'page-actions-about');
  // leaving the page ends the reading
  await page.getByRole('button', { name: '‹ Reader', exact: true }).click();
  await expect(bar).toHaveCount(0);
});
