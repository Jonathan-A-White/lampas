// src/resources/index.ts — every study resource, in the order Settings lists them. A new resource is one file here plus one line below
// (docs/resources.md). Settings, the word sheet and the tests read this list and nothing else.
import { accordance } from './accordance';
import { logos } from './logos';
import { strongs } from './strongs';
import type { StudyResource } from './types';

export type { ResourceOption, StudyLink, StudyResource, StudyWord } from './types';
export { optionOf } from './types';

export const RESOURCES: readonly StudyResource[] = [strongs, logos, accordance];

export const resourceOf = (id: string): StudyResource | undefined => RESOURCES.find((r) => r.id === id);
