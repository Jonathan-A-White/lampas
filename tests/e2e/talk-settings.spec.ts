// tests/e2e/talk-settings.spec.ts — Settings > Talk (mw-06ggew.8): Talk Hold | Tap and Send On release | By button, kept on the device, read live by Ask the tutor.
// At 390 x 844 he switches to Tap and By button in Settings and the Ask the tutor bar changes: Hold to ask becomes Tap to ask, and the hint under it says the words wait in the box.
import { expect, test } from '@playwright/test';
import { honestMic } from '../support/honest-fakes';
import { leaveSettings, openGroup } from './settings-group';
import { askBar, composerOf } from './ask-composer';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { chooseAction } from './verse-view';

const VIEWPORT = { width: 390, height: 844 };

test('Settings > The tutor > Talk: Tap and By button change the Ask the tutor bar, and stay after a reload', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await honestMic(page);
  await openUnlocked(page);
  await page.goto('/#/settings');
  await openGroup(page, 'The tutor');

  // Hold and On release until he chooses
  const talk = page.getByRole('group', { name: 'Talk', exact: true });
  const send = page.getByRole('group', { name: 'Send', exact: true });
  await talk.scrollIntoViewIfNeeded();
  await expect(talk.getByRole('button', { name: 'Hold', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(send.getByRole('button', { name: 'On release', exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (const button of [talk.getByRole('button', { name: 'Tap', exact: true }), send.getByRole('button', { name: 'By button', exact: true })]) {
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  }

  await talk.getByRole('button', { name: 'Tap', exact: true }).click();
  await send.getByRole('button', { name: 'By button', exact: true }).click();
  await expect(talk.getByRole('button', { name: 'Tap', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(send.getByRole('button', { name: 'By button', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await shot(page, 'talk-settings');

  // kept on the device
  await page.reload();
  await expect(page.getByRole('group', { name: 'Talk', exact: true }).getByRole('button', { name: 'Tap', exact: true })).toHaveAttribute('aria-pressed', 'true');

  // the Ask the tutor bar reads them: Tap to ask, and the words wait in the box
  await leaveSettings(page);
  await expect(page.locator('[data-verse="28"]')).toBeVisible();
  await chooseAction(page, 28, 'Ask the tutor');
  await expect(askBar(page)).toHaveText('Tap to ask');
  await expect(composerOf(page)).toContainText('The words wait in the box for you to fix, then Send.');
});
