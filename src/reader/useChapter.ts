// src/reader/useChapter.ts — fetches the chapter the Reader shows (docs/module-map.md R1): the chapter once it is here, `failed` when it cannot be
// fetched, and retry to ask again (a request still hanging is dropped first, so Try again does not wait on it).
import { useEffect, useState } from 'react';
import { forgetChapter, loadChapter, type Chapter } from '../data/chapter';

export function useChapter(book: string, chapterN: number) {
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    loadChapter(book, chapterN).then(
      (c) => current && (setFailed(false), setChapter(c)),
      () => current && setFailed(true),
    );
    return () => {
      current = false;
    };
  }, [attempt, book, chapterN]);
  return {
    chapter,
    failed,
    retry: () => {
      forgetChapter(book, chapterN);
      setAttempt((n) => n + 1);
    },
  };
}
