// tests/support/chapter-fetch.ts — a fetch that answers /data/<book>/<n>.json, /data/index.json and /data/lexicon.json (and the Hebrew lexicon-hbo.json, frequency-hbo.json) with the committed file read
// from disk (a chapter in tests/fixtures/data first, then public/data) and refuses everything else, so a test proves the reader calls nothing beyond the app's own data.
import { existsSync, readFileSync } from 'node:fs';
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
      if (!/^\/data\/([0-9a-z]+\/\d+|ladder\/(?:el|en|he)|lexicon|lexicon-hbo|index|frequency|frequency-hbo)\.json$/.test(path)) return new Response('not found', { status: 404 });
      // a chapter copied into tests/fixtures/data by scripts/fixture-chapter.mjs is served in place of the built one
      const file = existsSync(`tests/fixtures${path}`) ? `tests/fixtures${path}` : `public${path}`;
      return new Response(readFileSync(file, 'utf8'), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }),
  );
  return stub;
}
