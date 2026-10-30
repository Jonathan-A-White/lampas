// src/copy/useCopyFormat.ts — the three rows of Settings > Reading > When you copy as one CopyFormat (src/copy/format.ts), following every change;
// undefined until they have been read. Used by the Verse view's Copy and Share and by the settings preview.
import { useMemo } from 'react';
import { copyLinkSetting, copyNumbersSetting, copyReferenceSetting } from '../settings/definitions';
import { useSetting } from '../settings/store';
import type { CopyFormat } from './format';

export function useCopyFormat(): CopyFormat | undefined {
  const reference = useSetting(copyReferenceSetting);
  const numbers = useSetting(copyNumbersSetting);
  const link = useSetting(copyLinkSetting);
  return useMemo(() => (reference && numbers && link ? { reference, numbers, link } : undefined), [reference, numbers, link]);
}
