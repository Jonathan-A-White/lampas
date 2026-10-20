import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { SEED_PUBLIC_KEY, openUnlicensed, refuseChain, seedDeviceKey } from './unlocked';

// Lampas is free to read (mw-8m9dyu.1): a phone with no licence, and nothing done to get past a gate (no openUnlocked), reaches the Reader.
test('a phone with no licence opens on the Reader at a phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openUnlicensed(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Unlock', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('device-key')).toHaveCount(0);
  await shot(page, 'free-to-read');
});

test('a shared verse link opens that verse for a phone with no licence', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openUnlicensed(page);
  await page.goto('/#/?ref=Rom.8.28');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Verse view' })).toBeVisible();
  await expect(page.locator('[data-verse="28"]').first()).toHaveAttribute('data-selected', 'true');
});

test('the Licence page, #/unlock, shows the phone’s key and says it is not licensed', async ({ page }) => {
  await refuseChain(page);
  await seedDeviceKey(page);
  await page.goto('/#/unlock');
  await expect(page.getByRole('heading', { name: 'Licence', exact: true })).toBeVisible();
  await expect(page.getByTestId('device-key')).toHaveText(SEED_PUBLIC_KEY);
  await expect(page.getByRole('status').getByText('Not licensed')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check again' })).toBeVisible();
});

// Settings with no licence (mw-8m9dyu.3): each AI option off and greyed with 'Needs a licence', which opens the Licence page at a phone width.
test('Settings shows the AI off with Needs a licence, which opens the Licence page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openUnlicensed(page);
  await page.goto('/#/settings');
  const tips = page.locator('[data-setting="tips"]');
  await tips.scrollIntoViewIfNeeded();
  await expect(tips.getByRole('button', { name: 'Off', exact: true })).toBeDisabled();
  const needs = tips.getByRole('button', { name: 'Needs a licence' });
  await expect(needs).toBeVisible();
  const box = (await needs.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  await shot(page, 'settings-needs-licence');
  await needs.click();
  await expect(page.getByRole('heading', { name: 'Licence', exact: true })).toBeVisible();
  await expect(page.getByRole('status').getByText('Not licensed')).toBeVisible();
  await expect(page.getByTestId('device-key')).toHaveText(SEED_PUBLIC_KEY);
  await shot(page, 'licence-page');
});

// Read it aloud sends his reading to the mill, so with no licence it is not drawn (mw-8m9dyu.5): not the action, not its Hold to read bar, not the Reading
// ladder, even for a phone that left the Verse view on Read it aloud; upright and sideways.
for (const [name, size] of [['upright', { width: 390, height: 844 }], ['sideways', { width: 844, height: 390 }]] as const) {
  test(`a phone with no licence has no Read it aloud, Hold to read bar or Reading ladder on the verse sheet, ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await openUnlicensed(page);
    await page.addInitScript(() => window.localStorage.setItem('lampas.verseAction', 'read'));
    await page.goto('/#/?ref=Rom.8.28');
    const view = page.getByRole('region', { name: 'Verse view' });
    await expect(view).toBeVisible();
    const actions = view.getByRole('group', { name: 'Actions', exact: true });
    await expect(actions.getByRole('button', { name: 'Listen', exact: true })).toBeVisible();
    await expect(actions.getByRole('button', { name: 'Copy link', exact: true })).toBeVisible();
    await expect(view.getByRole('button', { name: 'Read it aloud' })).toHaveCount(0);
    await expect(view.getByRole('button', { name: /^Hold to read/ })).toHaveCount(0);
    await expect(view.getByRole('button', { name: 'Reading ladder' })).toHaveCount(0);
    await expect(view.getByRole('region', { name: 'Reading check' })).toHaveCount(0);
    await expect(page.locator('[data-hold-bar]')).toHaveCount(0);
    await shot(page, `verse-view-no-licence-${name}`);
  });
}

test('a phone with no licence has no Reading ladder on the Goal screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openUnlicensed(page);
  await page.goto('/#/goal');
  await expect(page.getByText('No goal yet')).toBeVisible();
  await expect(page.locator('[data-ladder-start]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Reading ladder/ })).toHaveCount(0);
});
