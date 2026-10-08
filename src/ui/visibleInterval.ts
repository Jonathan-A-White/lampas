// src/ui/visibleInterval.ts — a timer that sleeps while the page is hidden and fires once on return
// (docs/pwa-best-practices.md section 11): ticks never use a bare setInterval.

/** Calls `fn` every `ms` while the page is visible, and once more the moment it becomes visible again. Returns the stop. */
export function setVisibleInterval(fn: () => void, ms: number): () => void {
  let id: number | undefined;
  const start = (): void => {
    id ??= window.setInterval(fn, ms);
  };
  const stop = (): void => {
    if (id !== undefined) {
      window.clearInterval(id);
      id = undefined;
    }
  };
  const onVisibility = (): void => {
    if (document.hidden) {
      stop();
    } else {
      fn();
      start();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  if (!document.hidden) start();
  return () => {
    stop();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
