// src/settings/applied.ts — one change an answer of the Bible talk made to a setting, as the talk keeps it (src/data/db.ts TalkTurn.changes). A file of its own,
// with no imports but a type, so the database module (which the service worker reaches, src/share/target.ts) pulls no screen or registry with it.
import type { SettingValue } from './define';

/** One change that was made: what it replaced (`from`), so Undo can put it back. `undone` is set once it has been. */
export interface AppliedChange {
  key: string;
  label: string;
  from: SettingValue;
  to: SettingValue;
  /** 'Greek speed 0.8x': what the talk shows after 'Changed:' */
  shown: string;
  undone?: boolean;
}
