// tests/support/short-timeouts.ts — finds a Playwright per-call `timeout:` under SHORT_TIMEOUT_MS with no comment on its line (mw-5r3p30.716).
// playwright.config.ts gives expect() 20 s (tests/support/timeouts.ts); a call that hands itself less is outrun by a loaded host unless it is a
// window in which nothing must happen, and a `//` comment on the line saying so is what lets it stand (tests/unit/playwright-timeouts.test.ts).

/** A per-call timeout under this many ms needs a comment on its line. */
export const SHORT_TIMEOUT_MS = 10_000;

/** `timeout: 5000`, `timeout: 5_000` or `timeout: 5 * 1000`; a name (`timeout: SOME_MS`) is not read. */
const TIMEOUT = /\btimeout:\s*(\d[\d_]*)(?:\s*\*\s*(\d[\d_]*))?(?![\w.])/g;

const msOf = (a: string, b?: string): number => Number(a.replace(/_/g, '')) * (b === undefined ? 1 : Number(b.replace(/_/g, '')));

/** Each line of `source` that sets a per-call `timeout:` under SHORT_TIMEOUT_MS in code and has no `//` comment with words in it. */
export function shortUncommentedTimeouts(source: string): { line: number; text: string }[] {
  const found: { line: number; text: string }[] = [];
  source.split('\n').forEach((text, index) => {
    if (/\/\/\s*\S/.test(text)) return;
    for (const m of text.matchAll(TIMEOUT)) {
      if (msOf(m[1], m[2]) < SHORT_TIMEOUT_MS) {
        found.push({ line: index + 1, text: text.trim() });
        break;
      }
    }
  });
  return found;
}
