// src/nav/screenFiles.ts — the files of src/screens/, by path and not loaded (mw-6ww.175.83): the screens' names are the files', which is all src/nav/route.ts needs to tell their addresses apart.
// The glob is lazy and its loaders are never called, so a test that imports route.ts does not load the screens (the whole app). Playwright's own loader (a spec that imports src/tools.ts, which imports route.ts)
// has no import.meta.glob: there no screen is known (route.ts reads only constants of the app there), so the list is empty.
function screenFiles(): string[] {
  try {
    return Object.keys(import.meta.glob('../screens/*.tsx'));
  } catch {
    return [];
  }
}

export const SCREEN_FILES: readonly string[] = screenFiles();
