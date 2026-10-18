// src/settings/link.ts — a link to each setting (mw-5r3p30.502): '#/settings?setting=<key>' opens Settings scrolled to that row, marks it and shows it though the
// search or its dependency would hide it (src/SettingsScreen.tsx, src/settings/rows.ts rowsAt). The key is one of the registry's SETTINGS (src/settings/registry.ts):
// a key that is not has no link, so the tutor's invented key (src/TutorLinks.tsx) and a mistyped address draw nothing. docs/links.md.
import { forgetScrollsAt } from '../nav/scrollMemory';
import { openHash, pathOf } from '../nav/route';
import { settingOf } from './registry';

/** The address that opens Settings at the setting `key`, or null when the registry has no such setting. */
export function settingLink(key: string): string | null {
  return settingOf(key) ? `#/settings?setting=${encodeURIComponent(key)}` : null;
}

/** The setting an address asks for ('#/settings?setting=textSize'), or null when it is not a Settings address or names no setting of the registry. */
export function settingKeyOf(hash: string): string | null {
  if (pathOf(hash) !== '#/settings') return null;
  const q = hash.indexOf('?');
  const key = new URLSearchParams(q < 0 ? '' : hash.slice(q + 1)).get('setting');
  return key !== null && settingOf(key) ? key : null;
}

/** Opens Settings at the setting `key` as a new Back step, from where he is; it starts at the row, not where he last left Settings. Nothing for a key without a link. */
export function openSetting(key: string): void {
  const link = settingLink(key);
  if (!link) return;
  forgetScrollsAt(link);
  openHash(link);
}
