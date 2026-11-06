// src/sermons/sources/index.ts — the registry of sermon sources: the bundled ones, one for each source of public/sermons/index.json (bundled.ts). Kept apart from src/sermons/index.ts so that the settings
// registry, which will make one On/Off switch per source (a later story), loads under plain Node too (npm run grind:build). A source of another kind is one file in this folder and a line here.
import type { SermonSource } from '../types';
import { bundledSources } from './bundled';

export const SOURCES: readonly SermonSource[] = [...bundledSources()];
