// tests/e2e/unlocked.ts — gives a page its licence state without the network: the device key is the
// test seam (docs/testing.md), the held memory is the offline grace's own record, and every chain
// lookup is refused, so the check falls back to that memory. openUnlocked is a licensed phone; openUnlicensed is one with
// no licence (Lampas opens for it all the same, mw-8m9dyu.1).
import type { Page } from '@playwright/test';
import { giveHisWords } from './his-words';

/** The private key 1 and its public key: the well-known generator point. */
export const SEED_PRIVATE_KEY = '0'.repeat(63) + '1';
export const SEED_PUBLIC_KEY = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';

export async function refuseChain(page: Page): Promise<void> {
  await page.route(/whatsonchain\.com/, (route) => route.abort());
}

export async function seedDeviceKey(page: Page, privateKeyHex: string = SEED_PRIVATE_KEY): Promise<void> {
  await page.addInitScript((hex) => window.localStorage.setItem('lampas.deviceKey', hex), privateKeyHex);
}

/** The local day as 'YYYY-MM-DD', as src/data/repositories/usage.ts dayOf writes it. */
function today(): string {
  const d = new Date();
  const two = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

/** The one-line hints of the main screens (src/tips/hints.ts, mw-5r3p30.824) are already dismissed, so no spec finds a card it is not about; `hints: true` leaves them due. */
async function dismissScreenHints(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (window.localStorage.getItem('lampas.tipsDismissed') === null) {
      window.localStorage.setItem('lampas.tipsDismissed', JSON.stringify(['goal-screen', 'words-screen', 'review-screen', 'memorize-screen', 'paradigms-screen']));
    }
  });
}

/** Past the gate: the seeded key, remembered as holding a licence a minute ago, the chain unreachable. Today's tip is marked as asked, so the
 * sitting sends no tips grist (src/tips/offer.ts), the phone holds the Governor's word list (tests/e2e/his-words.ts; `empty: true` is a new install, mw-5r3p30.385), the welcome is already done (`welcome: true` leaves it due), and a new question card takes a tap at once (`lampas.settleMs` 0); `tips: true` leaves the day free for a spec that wants the grist. */
export async function openUnlocked(page: Page, options: { tips?: boolean; welcome?: boolean; empty?: boolean; hints?: boolean } = {}): Promise<void> {
  if (!options.empty) await giveHisWords(page);
  if (!options.hints) await dismissScreenHints(page);
  await refuseChain(page);
  await seedDeviceKey(page);
  await page.addInitScript(
    ([publicKeyHex, at]) => window.localStorage.setItem('lampas.licenceHeld', JSON.stringify({ publicKeyHex, at })),
    [SEED_PUBLIC_KEY, Date.now() - 60_000] as const,
  );
  // a new question card ignores taps for a moment (src/ui/settle.ts, mw-hqd5bz.21); a spec taps the instant a card is drawn
  await page.addInitScript(() => window.localStorage.setItem('lampas.settleMs', '0'));
  if (!options.tips) await page.addInitScript((day) => window.localStorage.setItem('lampas.tipsDay', day), today());
  // a new licensed reader is welcomed by the tutor (src/Welcome.tsx, mw-yrmkdf.3): a spec that is not about the welcome marks it done, `welcome: true` leaves it due
  if (!options.welcome) await page.addInitScript(() => window.localStorage.setItem('lampas.welcome', 'done'));
}

/** A phone with no licence: the seeded key, nothing remembered, the chain unreachable (so useLicence says not-licensed). Same quiet as openUnlocked otherwise. */
export async function openUnlicensed(page: Page, options: { tips?: boolean; empty?: boolean; hints?: boolean } = {}): Promise<void> {
  if (!options.empty) await giveHisWords(page);
  if (!options.hints) await dismissScreenHints(page);
  await refuseChain(page);
  await seedDeviceKey(page);
  await page.addInitScript(() => window.localStorage.setItem('lampas.settleMs', '0'));
  if (!options.tips) await page.addInitScript((day) => window.localStorage.setItem('lampas.tipsDay', day), today());
}
