// src/settings/applied.ts — one change an answer of the Bible talk made to a setting, as the talk keeps it (src/data/db.ts TalkTurn.changes). A file of its own,
// with no imports but a type, so the database module (which the service worker reaches, src/share/target.ts) pulls no screen or registry with it.
// The shape is the kit's (pwa-kit/settings): `from` is what the change replaced so Undo can put it back, `undone` is set once it has been.
export type { AppliedChange } from 'pwa-kit/settings';
