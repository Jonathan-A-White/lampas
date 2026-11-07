// src/nav/LinkOpener.tsx — shown in place of the Reader while a link in the address (#/?ref=… or #/?word=…, src/nav/links.ts) is resolved against the
// book index or the lexicon (both precached, so this is a moment). It then announces the result (src/nav/linkRequest.ts) and replaces the address with the
// plain reader address, and the Reader opens there. It never leaves a blank screen: whatever the link says, the reader opens somewhere.
import { useEffect } from 'react';
import { loadCanonIndex } from '../data/chapter';
import { loadLexicon, septuagintLemmas } from '../data/lexicon';
import { getOpenChapter } from '../data/readerChapter';
import { announceLink } from './linkRequest';
import { findWord, isHebrewText, notHeld, resolveReference, type Link } from './links';
import { bringVerse } from './readerRequest';
import { readerHash, readerOf, replaceHash, type ReaderAddress } from './route';

/** The address the link opens, keeping the view and weave the link carried. */
function plainAddress(kept: ReaderAddress, place: Pick<ReaderAddress, 'book' | 'chapter' | 'verse'>): string {
  return readerHash({ view: kept.view, weave: kept.weave, ...place });
}

async function open(link: Link, hash: string, current: () => boolean): Promise<void> {
  const kept = readerOf(hash);
  const there = getOpenChapter();
  if (link.kind === 'reference') {
    const index = await loadCanonIndex().catch(() => null);
    if (!current()) return;
    const opened = resolveReference(link.text, index, there, link.printed);
    announceLink({ book: opened.book, chapter: opened.chapter, verse: opened.verse, notice: opened.notice, word: null });
    // a verse or a range ('Heb 7:1-3') opens the normal Reader on the chapter (mw-5r3p30.1025): not the Verse view, nothing selected, the verse (a range's first) brought to the top with
    // the section heading above it (src/reader/useBringVerse.ts), as far as the text allows: the chapter's last verses stand where the box ends. A chapter alone opens the chapter.
    // The Immersive reader setting is left as it is, On or Off (mw-5r3p30.1028): a link never changes a setting.
    if (opened.verse !== null) bringVerse(opened.book, opened.chapter, opened.verse, { heading: true });
    replaceHash(plainAddress(kept, { book: opened.book, chapter: opened.chapter }));
    return;
  }
  // the Hebrew lexicon is asked for only when the text names a Hebrew word (an H number or Hebrew letters): a Greek link loads what it always did
  const lexicon = await loadLexicon(isHebrewText(link.text) ? 'hbo' : 'grc').catch(() => null);
  if (!current()) return;
  let found = lexicon ? findWord(link.text, lexicon) : undefined;
  // a Greek word only the Septuagint has (mw-u2w5klk.16): asked for only when the New Testament's lexicon lacks it and the setting is On
  if (lexicon && !found && !isHebrewText(link.text)) {
    const septuagint = await septuagintLemmas().catch(() => ({}));
    if (!current()) return;
    found = findWord(link.text, lexicon, undefined, septuagint);
  }
  const notice = found ? null : lexicon ? notHeld(link.text, there.title) : `Could not look up “${link.text}” just now; showing ${there.title}.`;
  const word = found ? { lemma: found.lemma, strongs: found.entry.s, gloss: found.entry.g } : null;
  announceLink({ book: there.book, chapter: there.chapter, verse: null, notice, word });
  replaceHash(plainAddress(kept, { book: there.book, chapter: there.chapter }));
}

export function LinkOpener({ link }: { link: Link }) {
  const { kind, text, printed } = link;
  useEffect(() => {
    let live = true;
    void open({ kind, text, ...(printed ? { printed } : {}) }, window.location.hash, () => live);
    return () => {
      live = false;
    };
  }, [kind, text, printed]);
  return (
    <p role="status" className="px-4 pt-6 text-center text-muted">
      Opening the link…
    </p>
  );
}
