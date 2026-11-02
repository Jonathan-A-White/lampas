// src/reader/useChapter.ts — fetches the chapter the Reader shows (docs/module-map.md R1): the chapter once it is here, `failed` when it cannot be
// fetched, and retry to ask again (a request still hanging is dropped first, so Try again does not wait on it). An Old Testament chapter is the Hebrew or, with Settings >
// Old Testament in Greek (Septuagint) On and the book shipped, the Greek (loadChapter reads the setting): the chapter is asked for again when the setting changes.
import { useEffect, useState } from 'react';
import { isHebrewBook } from '../data/books';
import { forgetChapter, loadChapter, type Chapter } from '../data/chapter';
import { septuagintSetting } from '../settings/definitions';
import { useSetting } from '../settings/store';

export function useChapter(book: string, chapterN: number) {
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const septuagint = useSetting(septuagintSetting);
  const lxx = isHebrewBook(book) ? septuagint : undefined;
  useEffect(() => {
    let current = true;
    loadChapter(book, chapterN).then(
      (c) => current && (setFailed(false), setChapter(c)),
      () => current && setFailed(true),
    );
    return () => {
      current = false;
    };
  }, [attempt, book, chapterN, lxx]);
  return {
    chapter,
    failed,
    retry: () => {
      forgetChapter(book, chapterN);
      setAttempt((n) => n + 1);
    },
  };
}
