// Stands for vite-plugin-pwa's virtual:pwa-register in vitest (vitest.config.ts alias); no worker is registered under test.
export function registerSW(): () => Promise<void> {
  return () => Promise.resolve();
}
