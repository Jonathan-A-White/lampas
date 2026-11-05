// src/settings/AskMoreScreen.tsx — Ask for more (mw-hqd5bz.37, #/askmore, Settings > More): the page for asks that would grow the app, an approach or
// programme, a study resource, a text or a translation. Every such ask goes through the tutor (the PWA sheet's rule 33, mw-5r3p30.726; the Governor dropped the
// forms that were under it): a talk over this screen opens with "I'd like Lampas to have " typed in its composer, not sent, and the tutor offers Send this to the
// makers (grinds/bible-talk.instructions/270-asks-the-app-cannot-meet.md). Asking goes to the mill, so without a licence the page says so and offers Needs a
// licence instead.
import { useMemo, useState } from 'react';
import { NO_CHAPTER } from '../data/chapter';
import { useAiAllowed } from '../gate/licenceContext';
import { backTo, openLicence } from '../nav/route';
import { ScreenHeader, HeaderButton } from '../ScreenHeader';
import type { TalkScope } from '../services/talk';
import { scopeRef } from '../services/talk';
import { TalkHost } from '../share/ShareTalk';
import { fitScreen, SCREEN_NAMES, type ScreenFact } from '../tutor/screen';
import { useReportScreen } from '../tutor/screenContext';

/** What the talk opens with in its composer: he finishes the sentence. */
export const ASK_BEGUN = "I'd like Lampas to have ";

const NAME = SCREEN_NAMES.askmore;

/** What the tutor is told of the page. */
const FACTS: ScreenFact[] = [
  { label: 'For', value: 'Asks that would grow Lampas: an approach or programme, a study resource, a text or a translation it does not have' },
  { label: 'How', value: 'He tells the tutor what he would like; the tutor offers to send it to the makers, and nothing is sent until he taps it' },
];

export function AskMoreScreen() {
  const ai = useAiAllowed();
  const [talking, setTalking] = useState(false);
  useReportScreen({ name: NAME, facts: FACTS });
  const scope = useMemo<TalkScope>(() => ({ title: NAME, chapter: NO_CHAPTER, verse: null, screen: fitScreen({ name: NAME, facts: FACTS }) }), []);
  const shared = useMemo(() => ({ files: [], text: ASK_BEGUN }), []);
  return (
    <>
      <ScreenHeader title={NAME} back={<HeaderButton onClick={() => backTo('settings')}>‹ Settings</HeaderButton>} />
      <main className="screen min-h-0 flex-1 px-4 pb-[var(--lp-end-inset)]">
        <p className="pt-4 text-base">
          Something Lampas does not have yet? An approach or programme for learning Greek, a study resource, a text or a translation: the makers want to
          hear.
        </p>
        {ai ? (
          <>
            <button
              type="button"
              onClick={() => setTalking(true)}
              className="mt-4 min-h-12 w-full rounded-xl bg-accent px-5 text-lg font-medium text-accent-fg"
            >
              Ask the tutor
            </button>
            <p className="pt-2 text-sm text-muted">Tell the tutor what you would like, and it offers to send it to the makers.</p>
          </>
        ) : (
          <div className="pt-4">
            <p className="text-base text-muted">Asking goes to the factory through the tutor's mill, so it needs a licence.</p>
            <button type="button" onClick={() => openLicence('settings')} className="mt-2 min-h-12 text-base font-medium text-accent underline">
              Needs a licence
            </button>
          </div>
        )}
      </main>
      {talking ? <TalkHost scope={scope} talkRef={scopeRef('', 0, scope)} book="" chapter={0} shared={shared} onClose={() => setTalking(false)} /> : null}
    </>
  );
}
