// tests/e2e/scroll-more-hint.spec.ts — a row that scrolls sideways shows there is more (mw-fnvjof.17.104): the next item peeks past the edge and a soft fade sits on the side that has more
// (src/ScrollMore.tsx, shared by every sideways row). Luke 15:11 draws every door of the Verse view's tools line (Copy, Share, Memorize, In Logos, In another book, Maps, Sermons, Split),
// more than 390 or 360 px hold. Checked in light, dark and sepia; a row that fits shows no fade.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

async function openLuke(page: Page, width: number, height = 844): Promise<{ line: Locator; tools: Locator }> {
  await page.setViewportSize({ width, height });
  await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: () => Promise.resolve(), configurable: true }));
  await routePostern(page, makeFakePostern());
  await openUnlocked(page);
  await page.goto('/#/?b=luk&c=15&v=11');
  await page.reload();
  const view = page.getByRole('region', { name: 'Verse view' });
  const tools = view.getByRole('group', { name: 'Tools', exact: true });
  await expect(tools.getByRole('button', { name: /^Sermons · \d+$/ })).toBeAttached();
  return { line: view.locator('[data-verse-tools-line]'), tools };
}

/** Where the doors stand against the row's edges, and which fades the row shows. */
async function stateOf(line: Locator) {
  return line.evaluate((row) => {
    const box = row.getBoundingClientRect();
    const items = [...row.querySelectorAll('button, a[href]')].map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0);
    const fade = (side: string) => {
      const el = row.parentElement?.querySelector(`[data-scroll-fade="${side}"]`);
      if (!el) return null;
      const style = getComputedStyle(el);
      return { shown: Number(style.opacity) > 0.5 && style.display !== 'none', image: style.backgroundImage };
    };
    return {
      left: box.left,
      right: box.right,
      scrollLeft: row.scrollLeft,
      max: row.scrollWidth - row.clientWidth,
      items: items.map((r) => ({ left: r.left, right: r.right })),
      start: fade('start'),
      end: fade('end'),
    };
  });
}

for (const width of [390, 360]) {
  test(`${width}: the tools line peeks the next door past the edge and fades on the side with more`, async ({ page }) => {
    const { line } = await openLuke(page, width);
    await expect.poll(async () => (await stateOf(line)).max, 'the doors are wider than the row').toBeGreaterThan(10);

    // at rest: a door is cut by the right edge (not ending on it), enough to read as a peek and not a sliver; a fade on the right, none on the left
    const rest = await stateOf(line);
    expect(rest.scrollLeft).toBe(0);
    const cut = rest.items.find((r) => r.right > rest.right - 1);
    if (!cut) throw new Error('no door is cut by the edge');
    expect(cut.left, 'the cut door starts inside the row').toBeLessThan(rest.right - 20);
    expect(cut.right - rest.right, 'the cut door runs well past the edge').toBeGreaterThanOrEqual(30);
    for (const r of rest.items) expect(Math.abs(r.right - rest.right), 'no door ends at the edge').toBeGreaterThan(8);
    expect(rest.end?.shown, 'a fade on the right').toBe(true);
    expect(rest.start?.shown ?? false, 'none on the left at the start').toBe(false);
    await shot(page, `scroll-more-start-${width}`);

    // mid-scroll: both
    await line.evaluate((row) => (row.scrollLeft = Math.max(1, (row.scrollWidth - row.clientWidth) / 2)));
    await expect.poll(async () => (await stateOf(line)).start?.shown, 'the left fade comes').toBe(true);
    const mid = await stateOf(line);
    expect(mid.end?.shown, 'both mid-scroll').toBe(true);

    // at the end: none on the right
    await line.evaluate((row) => (row.scrollLeft = row.scrollWidth));
    await expect.poll(async () => (await stateOf(line)).end?.shown ?? false, 'the right fade goes').toBe(false);
    const end = await stateOf(line);
    expect(end.start?.shown, 'a fade on the left at the end').toBe(true);
    await shot(page, `scroll-more-end-${width}`);

    // no arrows, no text in the fades
    const texts = await line.evaluate((row) => [...(row.parentElement?.querySelectorAll('[data-scroll-fade]') ?? [])].map((el) => (el.textContent ?? '').trim()));
    expect(texts.every((t) => t === '')).toBe(true);
  });
}

for (const theme of ['light', 'dark', 'sepia']) {
  test(`${theme}: the fade is the page's own background colour`, async ({ page }) => {
    const { line } = await openLuke(page, 390);
    await expect.poll(async () => (await stateOf(line)).max).toBeGreaterThan(10);
    await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme);
    const wanted = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.backgroundColor = 'var(--color-canvas)';
      document.body.append(probe);
      const colour = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return colour;
    });
    const [r, g, b] = wanted.match(/\d+(\.\d+)?/g)!.slice(0, 3);
    await expect
      .poll(async () => (await stateOf(line)).end?.image ?? '', 'the fade runs to the canvas colour')
      .toContain(`rgb(${r}, ${g}, ${b})`);
    await shot(page, `scroll-more-${theme}`);
  });
}

test('a row that fits shows no fade', async ({ page }) => {
  const { line } = await openLuke(page, 1000, 844);
  await expect.poll(async () => (await stateOf(line)).items.length).toBeGreaterThan(4);
  const state = await stateOf(line);
  expect(state.max, 'every door fits').toBeLessThanOrEqual(1);
  expect(state.start?.shown ?? false).toBe(false);
  expect(state.end?.shown ?? false).toBe(false);
});
