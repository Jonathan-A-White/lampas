// tests/support/chapter-fetch.ts — a fetch that answers /data/<book>/<n>.json with the committed file read
// from disk and refuses everything else, so a test proves the reader calls nothing beyond the app's own data.
import { readFileSync } from 'node:fs';
import { vi } from 'vitest';
import { forgetChapters } from '../../src/data/chapter';

export interface ChapterFetch {
  /** every URL asked for since the last stub */
  requests: string[];
}

export function stubChapterFetch(): ChapterFetch {
  const stub: ChapterFetch = { requests: [] };
  forgetChapters();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      stub.requests.push(url);
      if (!/^\/data\/[0-9a-z]+\/\d+\.json$/.test(url)) return new Response('not found', { status: 404 });
      return new Response(readFileSync(`public${url}`, 'utf8'), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }),
  );
  return stub;
}
