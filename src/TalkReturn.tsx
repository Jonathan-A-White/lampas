// src/TalkReturn.tsx — opens the Talk sheet again when Back brings him from the table the tutor linked to where the sheet was (src/talkReturn.ts, mw-5r3p30.990). The sheet comes
// back on its own, over the screen it was over, with the conversation as it stood (the turns are kept); Back then closes it, as it closes any sheet.
import { useEffect, useState } from 'react';
import { ReturnedTalk } from './AskTutor';
import { useAddress } from './nav/route';
import { dropHeldTalk, holdTalkStillWanted, useReturnedTalk, type HeldTalk } from './talkReturn';

export function TalkReturn() {
  const returned = useReturnedTalk();
  const address = useAddress();
  // the sheet, once it is back, is the screen's own: its entry in history makes the hold look as if he had left, so it is taken up and the hold let go at once
  const [shown, setShown] = useState<HeldTalk | null>(null);
  if (returned && returned !== shown) setShown(returned);
  useEffect(() => {
    if (returned) dropHeldTalk();
  }, [returned]);
  // he went somewhere that is neither the table nor the screen the sheet was over: the hold is no longer his
  useEffect(() => {
    if (!holdTalkStillWanted()) dropHeldTalk();
  }, [address]);
  return shown ? <ReturnedTalk scope={shown.scope} onClose={() => setShown(null)} /> : null;
}
