// src/screens/index.ts — the screens of the app as App draws them, gathered from the files of this directory (mw-6ww.175.83): a new screen is one new file here (src/nav/screen.ts says what it declares) and edits neither
// src/nav/route.ts nor src/App.tsx. This file loads every screen, so only App imports it; src/nav/route.ts knows the files' names alone (src/nav/screenFiles.ts).
import { renderersOf, type Modules } from '../nav/screen';

/** The exports of each screen file. */
export const SCREEN_MODULES: Modules = import.meta.glob('./*.tsx', { eager: true });

/** What draws each screen, by name. */
export const RENDERERS = renderersOf(SCREEN_MODULES);
