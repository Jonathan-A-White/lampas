// src/settings/helpText.ts — a Settings row's longer help is written as Markdown (a list for steps and options, the names in bold); this is the same help as plain
// words, for the speaker beside it and for the search: no star, hash, bullet or backtick, a stop at the end of each list line, and the step's dot-separated number
// and name (0 · Just English) as 'Just English' with a pause the voice can use.
import { markdownToSpeech } from '../markdown/plain';

/** The help as the words to say or to search: its Markdown marks gone, a list read in order. */
export const helpPlain = (help: string): string => markdownToSpeech(help).replace(/\s·\s/g, ', ');
