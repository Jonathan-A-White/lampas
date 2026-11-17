// tests/e2e/library-bulk-dimmed.spec.ts — a page of the Library at 390x844 (mw-qtu3zvz.196, src/library/KindPage.tsx): All on and All off are dimmed, drawn at half opacity and aria-disabled, while they would
// change nothing (every lexicon On already, or every one Off), and bright while they have work to do. A dimmed button keeps its 48 px box, so the thumb still lands on it.
import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

test('Lexicons: All on is dimmed once every lexicon is On, All off once every one is Off, and each is bright while it has work to do', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.goto('/#/library?kind=lexicon');
  await expect(page.getByRole('heading', { name: 'Lexicons', level: 1 })).toBeVisible();
  // the list is drawn, so the page knows the shelf: BDAG starts pinned and the rest are off, and both buttons have work to do
  await expect(page.getByRole('radiogroup', { name: 'BDAG', exact: true })).toBeVisible();
  const allOn = page.getByRole('button', { name: 'All on', exact: true });
  const allOff = page.getByRole('button', { name: 'All off', exact: true });
  for (const button of [allOn, allOff]) {
    await expect(button).not.toHaveAttribute('aria-disabled', 'true');
    await expect(button).toHaveCSS('opacity', '1');
  }

  // every lexicon On: All on would change nothing, so it is dimmed and says so; All off is not
  await allOn.click();
  await expect(page.getByTestId('kind-status')).toHaveText('29 on');
  await expect(allOn).toHaveAttribute('aria-disabled', 'true');
  await expect(allOn).toHaveCSS('opacity', '0.5');
  await expect(allOff).not.toHaveAttribute('aria-disabled', 'true');
  await expect(allOff).toHaveCSS('opacity', '1');
  // dimmed, it is still the 48 px button
  expect((await allOn.boundingBox())!.height).toBeGreaterThanOrEqual(47.5);
  await shot(page, 'library-all-on-dimmed');

  // every lexicon Off: now All off is the dimmed one, and All on is bright again
  await allOff.click();
  await expect(page.getByTestId('kind-status')).toHaveText('none on');
  await expect(allOff).toHaveAttribute('aria-disabled', 'true');
  await expect(allOff).toHaveCSS('opacity', '0.5');
  await expect(allOn).not.toHaveAttribute('aria-disabled', 'true');
  await expect(allOn).toHaveCSS('opacity', '1');
  await shot(page, 'library-all-off-dimmed');
});
