// src/reader/textClass.ts — the classes the verse drawing shares (moved as is from src/Reader.tsx, module map R1a).
import type { ReaderView } from '../data/repositories';

export const textClass = (view: ReaderView) =>
  view === 'greek' ? 'font-greek text-[length:var(--lp-greek-size)]' : 'font-sans text-[length:var(--lp-english-size)]';

export const READING_CLASS = 'bg-accent/30';

