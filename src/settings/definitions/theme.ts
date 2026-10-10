// The Theme (Settings > Appearance): the colours, from src/appearance/themes.ts. src/appearance/appearanceSync.ts paints it.
import { DEFAULT_THEME, THEMES, type Theme } from '../../appearance/themes';
import { defineSetting } from '../define';

export const themeSetting = defineSetting<Theme>({
  key: 'theme',
  default: DEFAULT_THEME,
  allowed: { kind: 'choice', values: THEMES.map((t) => ({ value: t.id, label: t.label })) },
  section: 'appearance',
  label: 'Theme',
  hint: "Light, dark, or the phone's own.",
  help: "The colours: Phone follows the phone's own light or dark setting.",
});
