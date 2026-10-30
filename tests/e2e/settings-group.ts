// tests/e2e/settings-group.ts — Settings is a home of groups and a page per group (mw-3ased2.1): a spec opens a group from the home and leaves for the Reader from a page.
import { expect, type Page } from '@playwright/test';

export { GROUP_PAGES } from '../support/settings-groups';

/** On the Settings home, opens the page of the group `title` ('Reading', 'The tutor') and waits for its title. */
export async function openGroup(page: Page, title: string): Promise<void> {
  await page.getByRole('list', { name: 'Settings groups' }).getByRole('button', { name: new RegExp(`^${title}`) }).click();
  await expect(page.getByRole('heading', { name: title, exact: true, level: 1 })).toBeVisible();
}

/** Leaves Settings for the Reader: from a group's page by ‹ Settings first, then ‹ Reader. */
export async function leaveSettings(page: Page): Promise<void> {
  const back = page.getByRole('button', { name: '‹ Settings', exact: true });
  if (await back.isVisible()) await back.click();
  await page.getByRole('button', { name: '‹ Reader', exact: true }).click();
}

/** Turns the Logos switch On in Study resources (a page of Settings), leaving the page open there: what hangs from it (Your Logos library, Bible in Logos, the Daily devotional) shows only while it is On (mw-rfjjzd.23). */
export async function turnLogosOn(page: Page): Promise<void> {
  await page.goto('/#/settings?group=study');
  const logos = page.getByRole('region', { name: 'Study resources' }).getByRole('switch', { name: 'Logos', exact: true });
  if ((await logos.getAttribute('aria-checked')) !== 'true') await logos.click();
  await expect(logos).toHaveAttribute('aria-checked', 'true');
}
