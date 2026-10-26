// src/reader/textClass.ts — the classes the verse drawing shares (moved as is from src/Reader.tsx, module map R1a).
import type { SourceLanguage } from '../data/chapter';
import type { ReaderView } from '../data/repositories';
import { sourceFace } from './sourceText';

/** The face and size of the verse text in `view`: the source view is the chapter's own language (Greek unless `source` is 'hbo'). */
export const textClass = (view: ReaderView, source: SourceLanguage = 'grc') =>
  view === 'greek' ? sourceFace(source) : 'font-sans text-[length:var(--lp-english-size)]';

export const READING_CLASS = 'bg-accent/30';
