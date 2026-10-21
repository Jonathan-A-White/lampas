// The look of a Settings row's help (mw-5r3p30.702): the 'More help' link is quiet (not the raw accent yellow, tap area 44 px), and the help it opens is a designed
// panel from the theme tokens (a surface card with a line border and an accent bar at its left), not a plain grey paragraph. Shown on the Greek dial's row, "How much Greek?",
// light and dark, upright (390x844) and sideways (844x390). The behaviour (toggle, aria-expanded, Read aloud) is held by read-aloud-anywhere and settings-search.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const SIZES = [
  { name: 'upright', width: 390, height: 844 },
  { name: 'sideways', width: 844, height: 390 },
] as const;
const SCHEMES = ['light', 'dark'] as const;

/** A colour token of the page as the browser computes it (rgb(...)), read through a probe element. */
const token = (page: Page, name: string) =>
  page.evaluate((variable) => {
    const probe = document.createElement('span');
    probe.style.color = `var(${variable})`;
    document.body.appendChild(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return colour;
  }, name);

for (const size of SIZES) {
  for (const scheme of SCHEMES) {
    test(`the help under How much Greek? reads as designed help, ${scheme}, ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.emulateMedia({ colorScheme: scheme });
      await openUnlocked(page);
      await page.goto('/#/settings');
      const row = page.locator('[data-setting="greekInterest"]');
      await expect(row).toBeVisible();
      const toggle = row.getByRole('button', { name: 'More help' });
      await toggle.scrollIntoViewIfNeeded();
      const tag = `settings-help-${scheme}-${size.name}`;
      await shot(page, `${tag}-closed`);

      // the link: quiet, with a tap area of 44 px (its ::before reaches past the words)
      const accent = await token(page, '--lp-accent');
      expect(await toggle.evaluate((el) => getComputedStyle(el).color)).not.toBe(accent);
      const reach = await toggle.evaluate((el) => {
        const before = getComputedStyle(el, '::before');
        return { height: parseFloat(before.height), width: parseFloat(before.width) };
      });
      expect(reach.height).toBeGreaterThanOrEqual(44);
      expect(reach.width).toBeGreaterThanOrEqual(44);

      await toggle.click();
      const panel = row.locator('[data-help-panel]');
      await expect(panel).toBeVisible();
      await expect(row.getByRole('button', { name: 'Less help' })).toHaveAttribute('aria-expanded', 'true');
      // the screenshot starts at the hint line, the link and the panel together
      await row.getByText('From none to all in').evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await page.evaluate(() => document.querySelector('.screen')?.scrollBy(0, -140));
      await shot(page, `${tag}-open`);

      // the panel: a surface card, a line border, an accent bar at its left, the reading colour for the words
      const look = await panel.evaluate((el) => {
        const s = getComputedStyle(el);
        const words = getComputedStyle(el.querySelector('[data-help-text]') as HTMLElement);
        return { background: s.backgroundColor, border: s.borderTopColor, bar: s.borderLeftColor, barWidth: parseFloat(s.borderLeftWidth), radius: parseFloat(s.borderTopLeftRadius), padding: parseFloat(s.paddingLeft), words: words.color };
      });
      expect(look.background).toBe(await token(page, '--lp-surface'));
      expect(look.border).toBe(await token(page, '--lp-line'));
      expect(look.bar).toBe(accent);
      expect(look.barWidth).toBeGreaterThanOrEqual(3);
      expect(look.radius).toBeGreaterThanOrEqual(8);
      expect(look.padding).toBeGreaterThanOrEqual(12);
      expect(look.words).toBe(await token(page, '--lp-fg'));
      // the six steps of the dial are a list, one line a step, each step's number and name in bold (mw-5r3p30.721)
      const steps = panel.locator('[data-help-text] li');
      await expect(steps).toHaveCount(6);
      await expect(steps.first().locator('strong')).toHaveText('0 · Just English');
      await expect(steps.last().locator('strong')).toHaveText('5 · All in');
      // it fits the screen's width
      const box = await panel.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(size.width);
    });
  }
}
