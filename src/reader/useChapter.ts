// src/reader/useChapter.ts — fetches the chapter the Reader shows (docs/module-map.md R1): the chapter once it is here, `failed` when it cannot be
// fetched, and retry to ask again.
import { useEffect, useState } from 'react';
import { loadChapter, type Chapter } from '../data/chapter';

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
  return { chapter, failed, retry: () => setAttempt((n) => n + 1) };
}
