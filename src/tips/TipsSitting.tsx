// src/tips/TipsSitting.tsx — rendered once beside the app (src/main.tsx, inside the licence gate): at the start of a sitting it asks for
// today's tip (offer.ts decides whether it may). It draws nothing; the card is TipCard.tsx.
import { useEffect } from 'react';
import { offerTip } from './offer';

export function TipsSitting() {
  useEffect(() => {
    void offerTip();
  }, []);
  return null;
}
