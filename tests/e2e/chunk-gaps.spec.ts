import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// mw-5r3p30.127: the gap between two chunks (or two Greek words) is one ordinary word space, the same as the space inside a chunk.
test.use({ viewport: { width: 412, height: 915 } });

/** The horizontal gap, in CSS px, between the end of the word `a` and the start of the word `b` inside one verse's text (Range rects). */
async function gap(page: Page, verse: number, a: string, b: string): Promise<number> {
  return page.locator(`[data-verse="${verse}"]`).first().evaluate(
    (root, [from, to]) => {
      const spots = (word: string) => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const found: { node: Text; at: number }[] = [];
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const text = n.textContent ?? '';
          const re = new RegExp(`(^|[^\\p{L}])${word}(?![\\p{L}])`, 'gu');
          for (let m = re.exec(text); m; m = re.exec(text)) found.push({ node: n as Text, at: m.index + m[1].length });
        }
        return found;
      };
      const rect = (node: Text, start: number, end: number) => {
        const r = document.createRange();
        r.setStart(node, start);
        r.setEnd(node, end);
        return r.getBoundingClientRect();
      };
      const first = spots(from)[0];
      const second = spots(to).find((s) => s.node !== first.node || s.at > first.at);
      if (!first || !second) throw new Error(`no ${from} then ${to}`);
      const left = rect(first.node, first.at, first.at + from.length);
      const right = rect(second.node, second.at, second.at + to.length);
      return right.left - left.right;
    },
    [a, b],
  );
}

async function open(page: Page, view: 'english' | 'greek') {
  await openUnlocked(page);
  await page.goto(`/#/?b=rom&c=8&view=${view}`);
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

test('English: chunk gaps equal the space inside a chunk', async ({ page }) => {
  await open(page, 'english');
  const inside = await gap(page, 1, 'those', 'who');
  for (const [a, b] of [['Therefore', 'there'], ['now', 'no'], ['Christ', 'Jesus']]) {
    expect(Math.abs((await gap(page, 1, a, b)) - inside), `${a} ${b}`).toBeLessThanOrEqual(2);
  }
  await shot(page, 'chunk-gaps-english');
});

test('Greek: word gaps equal an ordinary word space', async ({ page }) => {
  await open(page, 'greek');
  // The reference: a space of the same face, measured inside one text node.
  const space = await page.locator('[data-verse="1"] [data-word]').first().evaluate((el) => {
    const probe = document.createElement('span');
    probe.style.whiteSpace = 'pre';
    probe.textContent = 'α α';
    const one = document.createElement('span');
    one.textContent = 'α';
    el.parentElement!.append(probe, one);
    const w = probe.getBoundingClientRect().width - 2 * one.getBoundingClientRect().width;
    probe.remove();
    one.remove();
    return w;
  });
  for (const [a, b] of [['Οὐδὲν', 'ἄρα'], ['ἄρα', 'νῦν'], ['νῦν', 'κατάκριμα']]) {
    expect(Math.abs((await gap(page, 1, a, b)) - space), `${a} ${b}`).toBeLessThanOrEqual(2);
  }
  await shot(page, 'chunk-gaps-greek');
});
