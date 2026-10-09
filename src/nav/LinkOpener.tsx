// src/nav/LinkOpener.tsx — shown in place of the Reader while a link in the address (#/?ref=… or #/?word=…, src/nav/links.ts) is resolved against the
// book index or the lexicon (both precached, so this is a moment). It then announces the result (src/nav/linkRequest.ts) and replaces the address with the
// plain reader address, and the Reader opens there. It never leaves a blank screen: whatever the link says, the reader opens somewhere.
import { useEffect } from 'react';
import { loadIndex } from '../data/chapter';
import { loadLexicon } from '../data/lexicon';
import { getOpenChapter } from '../data/readerChapter';
import { announceLink } from './linkRequest';
import { findWord, notHeld, resolveReference, type Link } from './links';
import { readerHash, readerOf, replaceHash, type ReaderAddress } from './route';

/** The address the link opens, keeping the view and weave the link carried. */
function plainAddress(kept: ReaderAddress, place: Pick<ReaderAddress, 'book' | 'chapter' | 'verse'>): string {
  return readerHash({ view: kept.view, weave: kept.weave, ...place });
}

async function open(link: Link, hash: string, current: () => boolean): Promise<void> {
  const kept = readerOf(hash);
  const there = getOpenChapter();
  if (link.kind === 'reference') {
    const index = await loadIndex().catch(() => null);
    if (!current()) return;
    const opened = resolveReference(link.text, index, there);
    announceLink({ book: opened.book, chapter: opened.chapter, verse: opened.verse, notice: opened.notice, word: null });
    replaceHash(plainAddress(kept, { book: opened.book, chapter: opened.chapter, verse: opened.verse ?? undefined }));
    return;
  }
  const lexicon = await loadLexicon().catch(() => null);
  if (!current()) return;
  const found = lexicon ? findWord(link.text, lexicon) : undefined;
  const notice = found ? null : lexicon ? notHeld(link.text, there.title) : `Could not look up “${link.text}” just now; showing ${there.title}.`;
  const word = found ? { lemma: found.lemma, strongs: found.entry.s, gloss: found.entry.g } : null;
  announceLink({ book: there.book, chapter: there.chapter, verse: null, notice, word });
  replaceHash(plainAddress(kept, { book: there.book, chapter: there.chapter }));
}

export function LinkOpener({ link }: { link: Link }) {
  const { kind, text } = link;
  useEffect(() => {
    let live = true;
    void open({ kind, text }, window.location.hash, () => live);
    return () => {
      live = false;
    };
  }, [kind, text]);
  return (
    <p role="status" className="px-4 pt-6 text-center text-muted">
      Opening the link…
    </p>
  );
}
