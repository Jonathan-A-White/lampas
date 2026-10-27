// src/speech/pageRuns.ts — a line of a page of prose (About, My study way, the Preface) as runs to read aloud: English in the English voice, each stretch
// of Greek or Hebrew in its own (the cut a long press makes on a word, src/ui/wordAt.ts, and the tutor's answers make: both are src/speech/languageRuns.ts).
import { languageRuns } from './languageRuns';
import type { Run } from './readAloud';

/** `text` cut into runs of one language each, in the order they come; a run with nothing to say is left out. */
export const pageRuns = (text: string): Run[] => languageRuns(text);
