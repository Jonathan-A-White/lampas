// src/themes/sources/index.ts — the registry of theme sources: the bundled ones, one for each source of public/themes/index.json (bundled.ts). Kept apart from src/themes/index.ts so that the settings registry, which
// makes one On/Off switch per source, loads under plain Node too (npm run grind:build). Another theme system is one file in this folder and a line here.
import type { ThemeSource } from '../types';
import { bundledSources } from './bundled';

export const SOURCES: readonly ThemeSource[] = [...bundledSources()];
