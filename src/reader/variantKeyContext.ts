// src/reader/variantKeyContext.ts — the way a brace opens the key to its marks (mw-9ji6ek0.43, src/reader/VariantKey.tsx). The Reader provides it; without it (a brace on a card) the brace draws no button.
import { createContext, useContext } from 'react';

export const VariantKeyContext = createContext<(() => void) | undefined>(undefined);
export const useOpenVariantKey = () => useContext(VariantKeyContext);
