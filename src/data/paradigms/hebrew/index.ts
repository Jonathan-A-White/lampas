// src/data/paradigms/hebrew/index.ts — the Hebrew paradigm tables (mw-gdcyf98.13, docs/paradigms.md 'The Hebrew tables'), in the order the Paradigms list shows them; src/data/paradigms/index.ts adds them to PARADIGMS.
import type { Paradigm } from '../types';
import { ARTICLE_HEBREW } from './article';
import { NOUN_SUFFIXES } from './nounSuffixes';
import { PRONOUNS_PERSONAL_HEBREW } from './pronounsPersonal';
import { QAL_STRONG } from './qalStrong';

/** One line per table: a new Hebrew table is one file here plus one line in this list. */
export const HEBREW_PARADIGMS: readonly Paradigm[] = [QAL_STRONG, PRONOUNS_PERSONAL_HEBREW, NOUN_SUFFIXES, ARTICLE_HEBREW];
