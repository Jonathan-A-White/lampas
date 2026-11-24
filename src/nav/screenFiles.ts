// src/nav/screenFiles.ts — the files of src/screens/, by path and not loaded (mw-6ww.175.83): the screens' names are the files', which is all src/nav/route.ts needs to tell their addresses apart.
// The glob is lazy and its loaders are never called, so a test that imports route.ts does not load the screens (the whole app).
export const SCREEN_FILES: readonly string[] = Object.keys(import.meta.glob('../screens/*.tsx'));
