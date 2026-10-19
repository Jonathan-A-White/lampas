import type { Page } from '@playwright/test';

/** What the Reader draws inside the reading text after the last verse, as 'tag:label' (a nav by its aria-label, a button by its text). */
export async function afterLastVerse(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const inner = document.querySelector('[data-reader]')?.firstElementChild;
    const kids = Array.from(inner?.children ?? []);
    let last = -1;
    kids.forEach((kid, i) => {
      if (kid.matches('[data-verse]') || kid.querySelector('[data-verse]')) last = i;
    });
    return kids.slice(last + 1).map((kid) => `${kid.tagName.toLowerCase()}:${kid.getAttribute('aria-label') ?? kid.textContent?.trim()}`);
  });
}
