// src/resources/logosRes.ts — the one place a Logos resource link is put together: the Logos app's own scheme (`logosres:<id>;<query>`) first and its
// ref.ly address as the fallback (`https://ref.ly/logosres/<id>?<query>`), opened only when the phone cannot open the scheme (src/resources/openApp.ts). The id is
// raw in the scheme and URI-encoded in the https path (the colon of `LLS:` becomes %3A). Lexicons (logos.ts), a Bible chapter or verse (logosBible.ts), a
// devotional (logosDevotional.ts), a grammar book (grammarBooks.ts) and a work (works.ts) all build theirs here. docs/resources.md has the sources.

/** The two forms of a link: what the `href` holds and what is opened if the phone has no app for it. */
export interface LogosLink {
  url: string;
  fallback: string;
}

/** The link to `id` at `query` (`hw=...`, `ref=Bible.Jn3.16`); `fallbackQuery` is the https query when it is written differently (a space is '_' in the scheme's, '+' in the https). */
export const resourceLink = (id: string, query: string, fallbackQuery: string = query): LogosLink => ({
  url: `logosres:${id};${query}`,
  fallback: `https://ref.ly/logosres/${encodeURIComponent(id)}?${fallbackQuery}`,
});

/** The link to the start of `id`, with no place named. */
export const resourceStart = (id: string): LogosLink => ({ url: `logosres:${id}`, fallback: `https://ref.ly/logosres/${encodeURIComponent(id)}` });
