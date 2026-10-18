import { createContext } from 'react';

/** The key of the setting a link opened Settings at (src/settings/link.ts): its row is marked and scrolled to until the next tap. Null when none. */
export const HighlightedSetting = createContext<string | null>(null);
