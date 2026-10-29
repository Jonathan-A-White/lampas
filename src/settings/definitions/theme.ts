// The Theme (Settings > Appearance): the colours, from src/appearance/themes.ts. src/appearance/appearanceSync.ts paints it.
import { DEFAULT_THEME, THEMES, type Theme } from '../../appearance/themes';
import { defineSetting } from '../define';

export const themeSetting = defineSetting<Theme>({
  key: 'theme',
  default: DEFAULT_THEME,
  allowed: { kind: 'choice', values: THEMES.map((t) => ({ value: t.id, label: t.label })) },
  section: 'appearance',
  label: 'Theme',
  hint: "Light, dark, sepia, high contrast, or the phone's own.",
  help: "The colours:\n\n- **Phone**: follows the phone's light or dark setting.\n- **Sepia**: warm paper with dark brown text, for long reading.\n- **High contrast**: pure white on black with thick outlines, for low vision.",
});
