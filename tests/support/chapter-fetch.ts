// tests/support/chapter-fetch.ts — a fetch that answers /data/<book>/<n>.json, /data/index.json and /data/lexicon.json with the committed file read
// from disk and refuses everything else, so a test proves the reader calls nothing beyond the app's own data.
import { readFileSync } from 'node:fs';
import { vi } from 'vitest';
import { forgetChapters } from '../../src/data/chapter';
import { forgetLexicon } from '../../src/data/lexicon';
import { forgetGoalNeeds } from '../../src/useGoalProgress';

export interface ChapterFetch {
  /** every URL asked for since the last stub */
  requests: string[];
}

export function stubChapterFetch(): ChapterFetch {
  const stub: ChapterFetch = { requests: [] };
  forgetChapters();
  forgetLexicon();
  forgetGoalNeeds();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      stub.requests.push(url);
      // a chapter is asked for with its fingerprint (?v=, src/data/chapter.ts chapterUrl); the file read is the one without it
      const path = url.replace(/^(\/data\/[0-9a-z]+\/\d+\.json)\?v=[0-9a-f]{12}$/, '$1');
      if (!/^\/data\/([0-9a-z]+\/\d+|ladder\/(?:el|en)|lexicon|index|frequency)\.json$/.test(path)) return new Response('not found', { status: 404 });
      return new Response(readFileSync(`public${path}`, 'utf8'), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }),
  );
  return stub;
}
