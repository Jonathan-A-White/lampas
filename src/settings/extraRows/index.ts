// src/settings/extraRows/index.ts — the rows of Settings that are not settings and the doors of its home, gathered by glob (src/settings/gather.ts): a file of this directory exports what it holds with
// extraRows(place, rows) (src/settings/row.ts) or homeDoor({...}); a new link or door is one new file and edits no list (mw-6ww.175.107).
import type { Modules } from "../gather";

export const EXTRA_MODULES: Modules = import.meta.glob(
  ["./*.ts", "!./index.ts"],
  { eager: true },
);
