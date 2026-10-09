// tests/e2e/unlocked.ts — gets a page past the licence gate without the network: the device key is the
// test seam (docs/testing.md), the held memory is the offline grace's own record, and every chain
// lookup is refused, so the gate falls back to that memory. The gate itself is unchanged.
import type { Page } from '@playwright/test';

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

/** Past the gate: the seeded key, remembered as holding a licence a minute ago, the chain unreachable. Today's tip is marked as asked, so the
 * sitting sends no tips grist (src/tips/offer.ts); `tips: true` leaves the day free for a spec that wants the grist. */
export async function openUnlocked(page: Page, options: { tips?: boolean } = {}): Promise<void> {
  await refuseChain(page);
  await seedDeviceKey(page);
  await page.addInitScript(
    ([publicKeyHex, at]) => window.localStorage.setItem('lampas.licenceHeld', JSON.stringify({ publicKeyHex, at })),
    [SEED_PUBLIC_KEY, Date.now() - 60_000] as const,
  );
  if (!options.tips) await page.addInitScript((day) => window.localStorage.setItem('lampas.tipsDay', day), today());
}
