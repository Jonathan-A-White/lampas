// src/memorize/MemorizeScreen.tsx — the Memorize route (#/memorize, docs/layout/memorize.md): a session when the address names one (#/memorize/<ref>/<lang>); the bare address, until the Memorize
// home is built (mw-fu7dqf.15), opens the next verse that is due, in the place of the entry he is on, or says Nothing due.
import { useEffect, useState } from 'react';
import { nextDueVerse } from '../data/repositories/memorize';
import { memorizeSessionOf, openMemorizeSession, useAddress } from '../nav/route';
import { HeaderButton, ScreenHeader } from '../ScreenHeader';
import { closeMemorize } from '../nav/route';
import { SCREEN_NAMES } from '../tutor/screen';
import { useReportScreen } from '../tutor/screenContext';
import { MemorizeSession } from './MemorizeSession';

function NothingDue() {
  useReportScreen({ name: SCREEN_NAMES.memorize, facts: [{ label: 'Due', value: 'nothing' }] });
  return (
    <>
      <ScreenHeader title={SCREEN_NAMES.memorize} back={<HeaderButton onClick={closeMemorize}>‹ Back</HeaderButton>} />
      <main className="screen min-h-0 flex-1 px-4">
        <p className="mt-3 text-base">Nothing due</p>
      </main>
    </>
  );
}

/** The bare address: the next verse that is due opens in place of it. */
function NextDue() {
  const [none, setNone] = useState(false);
  useEffect(() => {
    let live = true;
    void nextDueVerse().then((next) => {
      if (!live) return;
      if (next) openMemorizeSession(next.ref, next.lang, { replace: true });
      else setNone(true);
    });
    return () => {
      live = false;
    };
  }, []);
  return none ? <NothingDue /> : <ScreenHeader title="" back={<HeaderButton onClick={closeMemorize}>‹ Back</HeaderButton>} />;
}

export function MemorizeScreen() {
  const session = memorizeSessionOf(useAddress());
  return session ? <MemorizeSession key={`${session.lang}:${session.ref}`} refName={session.ref} lang={session.lang} /> : <NextDue />;
}
