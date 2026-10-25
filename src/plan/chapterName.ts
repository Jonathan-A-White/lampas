// src/plan/chapterName.ts — a plan chapter by name: 'Leviticus 3', 'Romans 8'. The plan holds both testaments, so the name is looked up in the Old Testament's books too.
import { bookOf } from '../data/books';
import type { PlanChapter } from '../data/plans';

export const chapterName = (c: PlanChapter): string => `${bookOf(c.code)?.name ?? c.code} ${c.chapter}`;
