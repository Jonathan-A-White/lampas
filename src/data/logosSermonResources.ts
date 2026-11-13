// src/data/logosSermonResources.ts — the Logos Resource IDs each bundled Logos sermon source opens its sermons in. In the data layer so that the shelf (src/data/repositories/library.ts) can read it without reaching up into src/sermons/ (eslint-rules/layers.js).

/** The Logos Resource IDs each bundled Logos source opens its sermons in (the ref.ly address of its rows; tests/unit/sermons-owned.test.ts holds this equal to the book files). */
export const LOGOS_RESOURCES: Readonly<Record<string, readonly string[]>> = {
  'greg-laurie-logos': ['LLS:GRGLRSRMNRCH'],
  'jd-greear-logos': ['LLS:JDGRRSRMNRCHV'],
  'skip-heitzig-logos': ['LLS:SKPHTZGSRMN'],
  'spurgeon-sermon-notes-logos': ['LLS:MYSRMNOTES01', 'LLS:MYSRMNOTES03'],
  'wesley-logos': ['LLS:36.0.11', 'LLS:WORKSWESLEY05', 'LLS:WORKSWESLEY06', 'LLS:WORKSWESLEY07'],
  'whitefield-logos': ['LLS:36.0.12'],
  'moody-logos': ['LLS:MENBBLMOODY', 'LLS:OVRCMNGLFMOODY', 'LLS:WAYGODMOODY', 'LLS:12SELSERMMOODY'],
};
