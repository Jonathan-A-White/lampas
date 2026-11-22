import type { Page } from '@playwright/test';

/**
 * The page handles each click on a button under `selector` 1.5 s late, as a loaded host can (mw-fnvjof.17.237): a press is handled, and its
 * setting written, after the click returns, so a spec that reloads straight after the click loses it. With this on, the state a press
 * changes (aria-pressed, data-selected) shows only once handled, and only then may the spec reload.
 */
export async function handleClicksLate(page: Page, selector: string, ms = 1500): Promise<void> {
  await page.addInitScript(
    ({ selector, ms }) => {
      const passing = new WeakSet<Event>();
      document.addEventListener(
        'click',
        (event) => {
          if (passing.has(event) || !(event.target instanceof Element)) return;
          const button = event.target.closest(selector);
          if (!button) return;
          event.stopImmediatePropagation();
          setTimeout(() => {
            const again = new MouseEvent('click', { bubbles: true, cancelable: true });
            passing.add(again);
            button.dispatchEvent(again);
          }, ms);
        },
        true,
      );
    },
    { selector, ms },
  );
}
