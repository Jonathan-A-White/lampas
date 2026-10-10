// src/share/talkScope.ts — the scope of the talk a conversation's key names (mw-y3qno5.2), made BEFORE the Talk sheet is drawn: the Share sheet stays up until it
// is ready, so one sheet takes the other's place in one commit (src/ui/sheetBack.ts hands the history entry over only within a commit).
import { useEffect, useMemo, useState } from 'react';
import { loadChapter, NO_CHAPTER, type Chapter, type Verse } from '../data/chapter';
import { titleOf } from '../data/books';
import { passageAt, passageVerse } from '../data/passage';
import type { TalkScope } from '../services/talk';
import { fitScreen } from '../tutor/screen';
import { placeOf, type TalkPlace } from './talkPlace';

/** The scope of a chapter's, verse's or passage's talk (or the quiz on one); null when the chapter has no such verse or passage. */
function bibleScope(place: Extract<TalkPlace, { kind: 'bible' }>, chapter: Chapter): TalkScope | null {
  const title = titleOf(place.book, place.chapter);
  if (place.unit === null) return { title, chapter, verse: null, ...(place.quiz ? { quiz: true } : {}) };
  const [first, last] = place.unit.split('-').map(Number);
  let verse: Verse | null | undefined;
  if (last === undefined) verse = chapter.verses.find((v) => v.n === first);
  else {
    const passage = passageAt(chapter.verses, first);
    verse = passage && passage.last === last ? passageVerse(passage) : undefined;
  }
  return verse ? { title, chapter, verse, ...(place.quiz ? { quiz: true } : {}) } : null;
}

/** The scope of a talk about a screen, or of a talk of its own. */
function plainScope(place: Extract<TalkPlace, { kind: 'screen' | 'free' }>, ref: string): TalkScope {
  if (place.kind === 'screen') return { title: place.name, chapter: NO_CHAPTER, verse: null, screen: fitScreen({ name: place.name, facts: [] }) };
  return {
    title: 'New talk',
    chapter: NO_CHAPTER,
    verse: null,
    free: ref,
    screen: fitScreen({ name: 'A talk with the tutor', facts: [{ label: 'Where', value: 'Started from Share > Lampas; it is not about a screen or a text' }] }),
  };
}

/** What the talk `ref` is about, once it can be drawn: a text's chapter is fetched first. `failed` is a chapter that cannot be had (offline, never read) or a verse it lacks. */
export type TalkScopeState = { status: 'loading' } | { status: 'failed'; title: string; retry: () => void } | { status: 'ready'; scope: TalkScope; book: string; chapter: number };

/** The scope of the talk `ref` names; null for no talk (or a key this app does not make). */
export function useTalkScope(ref: string | null): TalkScopeState | null {
  const place = useMemo(() => (ref ? placeOf(ref) : null), [ref]);
  const [attempt, setAttempt] = useState(0);
  // the chapter fetched for the talk, or the failure, with the key it was fetched for
  const [fetched, setFetched] = useState<{ key: string; chapter: Chapter | null } | null>(null);
  const bible = place?.kind === 'bible' ? place : null;
  const key = bible ? `${bible.book}.${bible.chapter}.${attempt}` : null;
  useEffect(() => {
    if (!bible || !key) return;
    let current = true;
    loadChapter(bible.book, bible.chapter).then(
      (chapter) => current && setFetched({ key, chapter }),
      () => current && setFetched({ key, chapter: null }),
    );
    return () => {
      current = false;
    };
    // the key names the book, the chapter and the attempt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return useMemo((): TalkScopeState | null => {
    if (!place || !ref) return null;
    if (place.kind !== 'bible') return { status: 'ready', scope: plainScope(place, ref), book: '', chapter: 0 };
    const retry = (): void => setAttempt((n) => n + 1);
    if (fetched?.key !== key) return { status: 'loading' };
    const scope = fetched.chapter ? bibleScope(place, fetched.chapter) : null;
    if (!scope) return { status: 'failed', title: titleOf(place.book, place.chapter), retry };
    return { status: 'ready', scope, book: place.book, chapter: place.chapter };
  }, [place, ref, fetched, key]);
}
