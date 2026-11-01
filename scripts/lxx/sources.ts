// scripts/lxx/sources.ts — the sources of the Septuagint derivation (docs/lxx-derivation.md), each at the commit the probe pinned
// (docs/sources/lxx-derivation-probe.md, 'Reproduce it'). A file is fetched into data/raw/lxx/<repo>/<commit>/<path> (git-ignored) and never
// again once it is there; nothing else in the derivation touches the network, and the tests read fixtures under tests/fixtures/lxx/.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fetchTo } from '../data/chapterWriter';

export interface PinnedSource {
  repo: string;
  commit: string;
  files: readonly string[];
}

/** Swete's Septuagint as eliranwong/LXX-Swete-1930 packs it: the text is public domain, the packaging GPL-3.0 (its LICENSE and README come with it). */
export const SWETE: PinnedSource = {
  repo: 'eliranwong/LXX-Swete-1930',
  commit: '1d3efc3c63bd384a4f3f07ed37eef54b0d45ac33',
  files: ['00-Swete_versification.csv', '01-Swete_word_with_punctuations.csv', 'LICENSE', 'README.md'],
};
export const SWETE_VERSIFICATION = SWETE.files[0];
export const SWETE_WORDS = SWETE.files[1];
export const SWETE_LICENCE = SWETE.files[2];
export const SWETE_README = SWETE.files[3];

/**
 * The same commit's SBL transliteration, one line to a word line of SWETE_WORDS (the derivation never reads it; the data build for the app does,
 * scripts/data-build-lxx.ts): a source of its own so that fetching the derivation's files stays as it was.
 */
export const SWETE_TRANSLIT_FILE = '03-Swete_SBL_transliterations.csv';
export const SWETE_TRANSLIT: PinnedSource = { repo: SWETE.repo, commit: SWETE.commit, files: [SWETE_TRANSLIT_FILE] };

/** STEPBible's TAGNT (the New Testament's forms, lemmas and parsing), TBESG (the Greek lemmas) and TVTMS (versification), all CC BY 4.0. */
export const STEP: PinnedSource = {
  repo: 'STEPBible/STEPBible-Data',
  commit: 'be4191f0082aeedddb0eff0c02c966292b2bd641',
  files: [
    'Translators Amalgamated OT+NT/TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt',
    'Translators Amalgamated OT+NT/TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt',
    'Lexicons/TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt',
    'Versification/TVTMS - Translators Versification Traditions with Methodology for Standardisation for Eng+Heb+Lat+Grk+Others - STEPBible.org CC BY.txt',
  ],
};
export const TAGNT_FILES = STEP.files.slice(0, 2);

export const RAW_DIR = join('data', 'raw', 'lxx');

/** Where a pinned file lives under rawDir: <repo>/<commit>/<path in the repo>. */
export const pinnedPath = (rawDir: string, src: PinnedSource, file: string): string => join(rawDir, src.repo, src.commit, file);

/** The raw URL of a file at its pinned commit. */
export const pinnedUrl = (src: PinnedSource, file: string): string =>
  `https://raw.githubusercontent.com/${src.repo}/${src.commit}/${file.split('/').map(encodeURIComponent).join('/')}`;

export type Fetcher = (url: string, dest: string) => Promise<void>;

/** Fetches each file of the source that rawDir lacks; a file already there is skipped. Returns the URLs fetched. */
export async function fetchPinned(rawDir: string, src: PinnedSource, fetcher: Fetcher = fetchTo, log: (line: string) => void = () => {}): Promise<string[]> {
  const fetched: string[] = [];
  for (const file of src.files) {
    const dest = pinnedPath(rawDir, src, file);
    if (existsSync(dest)) continue;
    const url = pinnedUrl(src, file);
    log(`fetching ${url}`);
    await fetcher(url, dest);
    fetched.push(url);
  }
  return fetched;
}

/** A pinned file's text, with a byte-order mark taken off. */
export const readPinned = (rawDir: string, src: PinnedSource, file: string): string => readFileSync(pinnedPath(rawDir, src, file), 'utf8').replace(/^\uFEFF/, '');
