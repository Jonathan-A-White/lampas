// src/nav/path.ts — the one tiny part of an address that links.ts reads, kept apart from route.ts (which pulls in the whole app) so the blog's tagger
// (src/reftagger/reftagger.ts) can share links.ts's book names without bundling the app. route.ts re-exports it.

/** The part of an address before its '?': '#/words', '#/' or ''. */
export function pathOf(hash: string): string {
  const q = hash.indexOf('?');
  return q < 0 ? hash : hash.slice(0, q);
}
