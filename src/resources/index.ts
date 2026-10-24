// src/resources/index.ts — every study resource, in the order Settings lists them. A new resource is one file here plus one line below
// (docs/resources.md). Settings, the word sheet and the tests read this list and nothing else.
import { logos } from './logos';
import { strongs } from './strongs';
import type { StudyResource } from './types';

export type { ResourceChoices, ResourceLang, ResourceOption, StudyLink, StudyPlace, StudyRef, StudyResource, StudyWord } from './types';
export { optionOf, tickedOf } from './types';

// Accordance is not listed (mw-5r3p30.738: untested, so a reader is not offered it). ./accordance stays built and tested: to list it again,
// add `import { accordance } from './accordance';` and put `accordance` after `logos` in the array below.
export const RESOURCES: readonly StudyResource[] = [strongs, logos];

export const resourceOf = (id: string): StudyResource | undefined => RESOURCES.find((r) => r.id === id);
