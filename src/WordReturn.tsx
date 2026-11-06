// src/WordReturn.tsx — opens the word sheet again when Back brings him from the word's table to where the sheet was (src/wordReturn.ts, mw-irpgqi.1). The sheet comes back on
// its own, over the screen it was over, with what it showed; Back then closes it, as it closes any sheet.
import { useEffect, useState } from 'react';
import { dropHeldWord, holdWordStillWanted, useReturnedWord, type HeldWord } from './wordReturn';
import { routeOf, useAddress } from './nav/route';
import { WordSheet } from './WordSheet';

export function WordReturn() {
  const returned = useReturnedWord();
  const address = useAddress();
  // the sheet, once it is back, is the screen's own: its entry in history makes the hold look as if he had left, so it is taken up and the hold let go at once
  const [shown, setShown] = useState<HeldWord | null>(null);
  // the returned sheet is WordReturn's own, not the screen's, so it is not taken away with the screen: when he goes to another screen from it (All lexicons > Manage, a table) it is closed here,
  // or it would stay over that page (mw-5r3p30.1114). The screen's own address moves under it (the Reader writes its verse in), so it is the screen that is compared, not the address.
  if (shown && routeOf(address) !== routeOf(shown.hash)) setShown(null);
  if (returned && returned !== shown) setShown(returned);
  useEffect(() => {
    if (returned) dropHeldWord();
  }, [returned]);
  // he went somewhere that is neither the table nor the screen the sheet was over: the hold is no longer his
  useEffect(() => {
    if (!holdWordStillWanted()) dropHeldWord();
  }, [address]);
  return shown ? <WordSheet chapter={shown.chapter} lookup={shown.lookup} onClose={() => setShown(null)} /> : null;
}
