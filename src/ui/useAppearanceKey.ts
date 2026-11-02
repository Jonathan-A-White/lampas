// src/ui/useAppearanceKey.ts — the Text size and the Font as one string that changes when either does, for a screen that must lay its lines again when they change (the Reader keeps its top
// verse, mw-9ji6ek0.46). They are applied at the root, not by the screen: the Text size is html's --lp-scale and the English Font html's --lp-font-english (src/appearance/appearanceSync.ts
// applyTextSize, applyFont), written by Settings, by the tutor or by another window, so the key is read from html's style and again when it changes, whoever wrote it.
import { useSyncExternalStore } from 'react';
import { ENGLISH_FONT_VAR } from '../appearance/fonts';

const SCALE_VAR = '--lp-scale';

const keyOf = (): string => {
  const style = document.documentElement.style;
  return `${style.getPropertyValue(SCALE_VAR)}|${style.getPropertyValue(ENGLISH_FONT_VAR)}`;
};

const subscribe = (notify: () => void): (() => void) => {
  const observer = typeof MutationObserver === 'function' ? new MutationObserver(notify) : null;
  observer?.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  return () => observer?.disconnect();
};

/** The Text size and the English Font as a string that changes with either; empty where there is no window (a server). */
export function useAppearanceKey(): string {
  return useSyncExternalStore(subscribe, keyOf, () => '');
}
