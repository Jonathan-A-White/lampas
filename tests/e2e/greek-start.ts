// tests/e2e/greek-start.ts — a spec that makes its own browser context does not get the config's storage state, so it starts the phone at 5, All in, itself (docs/testing.md,
// 'The Greek dial's start level'): a new phone is otherwise placed at 0, Just English, which hides the Greek these specs use (mw-3ased2.2).
import type { BrowserContext } from '@playwright/test';

export const startAtAllIn = async (context: BrowserContext): Promise<void> => {
  await context.addInitScript(() => window.localStorage.setItem('lampas.greekInterestStart', '5'));
};
