// src/UpdateBanner.tsx: 'Update ready, tap to reload', above the content while a newer build waits.
// The tap goes dead and says 'Updating…' until the page reloads.
import { applyUpdate, useUpdateState } from './services/appUpdate';

export function UpdateBanner() {
  const state = useUpdateState();
  if (state === 'none') return null;
  const updating = state === 'updating';
  return (
    <button
      type="button"
      onClick={applyUpdate}
      disabled={updating}
      className="flex w-full shrink-0 items-center justify-center border-b border-line bg-accent px-3 py-3 text-base font-medium text-accent-fg disabled:opacity-70"
    >
      {updating ? 'Updating…' : 'Update ready, tap to reload'}
    </button>
  );
}
