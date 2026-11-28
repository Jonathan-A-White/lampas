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
      const fbox = el.getBoundingClientRect();
      const chevron = el.querySelector('[data-scroll-chevron]');
      const c = chevron?.getBoundingClientRect();
      return {
        shown: Number(style.opacity) > 0.5 && style.display !== 'none',
        image: style.backgroundImage,
        left: fbox.left,
        right: fbox.right,
        width: fbox.width,
        pointer: style.pointerEvents,
        chevron: chevron && c ? { left: c.left, right: c.right, width: c.width, hidden: chevron.closest('[aria-hidden="true"]') !== null, text: (chevron.textContent ?? '').trim() } : null,
      };
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

for (const width of [390, 360, 320]) {
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
    // the cue is clear: a fade 24 px or wider at the row's own right edge, with a › over it that takes no tap
    expect(rest.end?.width ?? 0, 'the fade is 24 px or wider').toBeGreaterThanOrEqual(24);
    expect(Math.abs((rest.end?.right ?? 0) - rest.right), 'the fade sits at the row\'s visible right edge').toBeLessThanOrEqual(1);
    expect(rest.end?.pointer, 'the fade takes no tap').toBe('none');
    const right = rest.end?.chevron;
    if (!right) throw new Error('no › over the right fade');
    expect(right.hidden, 'the › is aria-hidden').toBe(true);
    expect(right.left, 'the › is inside the fade').toBeGreaterThanOrEqual((rest.end?.left ?? 0) - 1);
    expect(right.right, 'the › is inside the row').toBeLessThanOrEqual(rest.right + 1);
    expect(rest.start, 'no ‹ at the start').toBeNull();
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
    expect(end.start?.width ?? 0, 'the left fade is 24 px or wider').toBeGreaterThanOrEqual(24);
    expect(Math.abs((end.start?.left ?? 0) - end.left), 'the left fade sits at the row\'s visible left edge').toBeLessThanOrEqual(1);
    const left = end.start?.chevron;
    if (!left) throw new Error('no ‹ over the left fade');
    expect(left.hidden, 'the ‹ is aria-hidden').toBe(true);
    expect(left.left, 'the ‹ is inside the row').toBeGreaterThanOrEqual(end.left - 1);
    expect(end.end, 'no › at the end').toBeNull();
    await shot(page, `scroll-more-end-${width}`);

    // the cues are drawn, not typed: no text in the fades
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

/** The door the row's right edge cuts: its part inside the row and its part past the edge, and the least gap before any door's end and the edge (mw-fnvjof.17.121). */
async function cutOf(line: Locator) {
  const s = await stateOf(line);
  const cut = s.items.find((r) => r.right > s.right + 1);
  return {
    cut,
    inside: cut ? s.right - cut.left : 0,
    past: cut ? cut.right - s.right : 0,
    nearestEnd: Math.min(...s.items.filter((r) => r.right <= s.right + 1).map((r) => Math.abs(s.right - r.right))),
    underFade: cut ? s.right - cut.left < 20 : false,
    state: s,
  };
}

test('390: after Memorize the tools line still cuts a door by the edge (Memorizing · English, Rehearse)', async ({ page }) => {
  const { line, tools } = await openLuke(page, 390);
  await tools.getByRole('button', { name: 'Memorize', exact: true }).click();
  await expect(tools.getByRole('button', { name: 'Memorizing · English' })).toBeVisible();
  await expect(tools.getByRole('button', { name: 'Rehearse' })).toBeAttached();
  await expect.poll(async () => (await stateOf(line)).max, 'the doors are wider than the row').toBeGreaterThan(10);
  await expect.poll(async () => (await cutOf(line)).inside, 'a door is cut by the edge with 24 px inside').toBeGreaterThanOrEqual(24);
  const c = await cutOf(line);
  expect(c.past, 'the cut door runs 20 px or more past the edge').toBeGreaterThanOrEqual(20);
  expect(c.nearestEnd, 'no door ends near the edge').toBeGreaterThan(8);
  expect(c.state.end?.shown, 'a fade on the right').toBe(true);
  await shot(page, 'scroll-more-memorizing-390');
});

for (const width of [412, 320]) {
  test(`${width}: at rest the door cut by the edge has 24 px inside and is not under the fade`, async ({ page }) => {
    const { line } = await openLuke(page, width, width === 412 ? 915 : 844);
    await expect.poll(async () => (await stateOf(line)).max, 'the doors are wider than the row').toBeGreaterThan(10);
    await expect.poll(async () => (await cutOf(line)).inside, 'a door is cut by the edge with 24 px inside').toBeGreaterThanOrEqual(24);
    const c = await cutOf(line);
    expect(c.underFade, 'the cut door is not wholly under the fade').toBe(false);
    expect(c.past, 'the cut door runs 20 px or more past the edge').toBeGreaterThanOrEqual(20);
    expect(c.nearestEnd, 'no door ends near the edge').toBeGreaterThan(8);
    await shot(page, `scroll-more-rest-${width}`);
  });
}

/** The end fade against the row it cues (mw-fnvjof.17.164): where its edges stand against the row's right edge, and the door under it. */
async function fadeOver(line: Locator) {
  return line.evaluate((row) => {
    const fade = row.parentElement?.querySelector('[data-scroll-fade="end"]');
    if (!fade) return null;
    const box = row.getBoundingClientRect();
    const f = fade.getBoundingClientRect();
    const under = [...row.querySelectorAll('button, a[href]')]
      .map((el) => ({ name: (el.textContent ?? '').trim(), r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && r.left < f.right && r.right > f.left && r.right > box.right + 1);
    return {
      rowLeft: box.left,
      rowRight: box.right,
      fadeLeft: f.left,
      fadeRight: f.right,
      overlapsRow: f.left < box.right && f.right > box.left,
      cut: under.map(({ name, r }) => ({ name, left: r.left, right: r.right })),
    };
  });
}

for (const state of ['at rest', 'after Memorize']) {
  test(`390: ${state} the tools line's end fade lies on the row's right edge, over the cut door`, async ({ page }) => {
    const { line, tools } = await openLuke(page, 390);
    if (state === 'after Memorize') {
      await tools.getByRole('button', { name: 'Memorize', exact: true }).click();
      await expect(tools.getByRole('button', { name: 'Memorizing · English' })).toBeVisible();
    }
    await expect.poll(async () => (await stateOf(line)).end?.shown, 'a fade on the right').toBe(true);
    const o = await fadeOver(line);
    if (!o) throw new Error('no end fade');
    expect(o.overlapsRow, 'the fade overlaps the scroll row').toBe(true);
    expect(Math.abs(o.fadeRight - o.rowRight), 'the fade ends within 2 px of the row\'s right edge').toBeLessThanOrEqual(2);
    expect(o.cut.length, 'a cut door is under the fade').toBeGreaterThan(0);
    for (const door of o.cut) expect(door.left, `the fade's left edge is inside the cut door "${door.name}"`).toBeLessThan(o.fadeLeft);
    await shot(page, `scroll-more-fade-over-${state === 'at rest' ? 'rest' : 'memorizing'}`);
  });
}

/** Sweep (mw-fnvjof.17.164): every fade on the page, each against the sideways scroller it cues (the one in its wrapper): an end fade ends at the scroller's right edge and a start fade begins at its left edge, within 2 px. A wrapper wider than its scroll box (padding on it) stands a fade off the edge. */
async function fadesOffTheirRows(page: Page): Promise<{ checked: number; off: string[] }> {
  return page.evaluate(() => {
    const off: string[] = [];
    const fades = [...document.querySelectorAll('[data-scroll-fade]')];
    for (const fade of fades) {
      const side = fade.getAttribute('data-scroll-fade');
      const scroller = [...(fade.parentElement?.children ?? [])].find((el) => el !== fade && /auto|scroll/.test(getComputedStyle(el).overflowX));
      const label = `${side} fade of ${scroller ? scroller.tagName.toLowerCase() + ' ' + ([...scroller.attributes].map((a) => a.name).filter((n) => n.startsWith('data-') || n === 'aria-label').join(' ') || (scroller.className || '').toString().slice(0, 60)) : 'no scroller'}`;
      if (!scroller) {
        off.push(`${label}: its wrapper holds no sideways scroller`);
        continue;
      }
      const row = scroller.getBoundingClientRect();
      const f = fade.getBoundingClientRect();
      const gap = side === 'end' ? Math.abs(f.right - row.right) : Math.abs(f.left - row.left);
      if (gap > 2) off.push(`${label}: ${gap.toFixed(1)} px off the row's edge`);
    }
    return { checked: fades.length, off };
  });
}

test('sweep 390: every fade on the Reader and on the Verse view stands on the edge of its own row', async ({ page }) => {
  const { line, tools } = await openLuke(page, 390);
  await expect.poll(async () => (await stateOf(line)).end?.shown, 'the tools line shows its fade').toBe(true);
  const verse = await fadesOffTheirRows(page);
  expect(verse.checked, 'the Verse view draws a fade').toBeGreaterThan(0);
  expect(verse.off).toEqual([]);
  await tools.getByRole('button', { name: 'Memorize', exact: true }).click();
  await expect(tools.getByRole('button', { name: 'Memorizing · English' })).toBeVisible();
  expect((await fadesOffTheirRows(page)).off).toEqual([]);
  // the Reader's chips row, at the narrowest window
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/#/?b=luk&c=15');
  await page.reload();
  await expect(page.locator('[data-reader-chips]')).toBeAttached();
  // the chips row stands in a padding-free wrapper, so wherever it overflows its fade is on its edge; it must not draw one off it
  expect((await fadesOffTheirRows(page)).off).toEqual([]);
});
