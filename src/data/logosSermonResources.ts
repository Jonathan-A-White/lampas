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
  // batch 3 (mw-qtu3zvz.20); Piper's, Bunyan's and Jimmy Evans's rows name no passage, so their books are read from the source's rows, not from a book file
  'augustine-logos': ['LLS:AGSTNSRMNS04'],
  'chrysostom-logos': ['LLS:6.60.10', 'LLS:6.60.11', 'LLS:6.60.12', 'LLS:6.60.13', 'LLS:6.60.14'],
  'piper-logos': ['LLS:86BDFD4BE2316756AFB52F8937D86322'],
  'bunyan-logos': ['LLS:WJB_BYNLST'],
  'charles-wesley-logos': ['LLS:SERMSCWESLEY', 'LLS:SERM1742WESLEY'],
  'jimmy-evans-logos': ['LLS:JIMMYEVANSSA'],
};
