// src/maps/sources/index.ts — the registry of map sources: one file in this folder and one line here (docs/maps.md). Kept apart from src/maps/index.ts, which reads the places (a Vite glob), so the settings registry,
// which makes one On/Off switch per source, loads under plain Node too (npm run grind:build).
import type { MapSource } from '../types';
import { bibleMapper } from './biblemapper';
import { logosAtlas } from './logosatlas';

export const SOURCES: readonly MapSource[] = [bibleMapper, logosAtlas];
