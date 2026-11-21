// src/speech/DataVoiceQuestion.tsx — the one question the Bible voice asks (mw-zbgo4ep.30): on mobile data, with Recording on Wi-Fi only, in a chapter David has recorded, the first time
// he taps Play. Two buttons: Play David on data (sets Bible voice to Recording (David) and plays David) and Keep the phone voice (plays the phone voice; never asked again).
// A tap outside, or the phone's Back (the card is a history step, as the chapter picker is: src/ui/sheetBack.ts, mw-zbgo4ep.42), takes the question down and starts nothing and he stays
// on the chapter; it is asked again at the next Play.
import { useEffect } from 'react';
import { useNoDoor } from '../tutor/door';
import { useSheetBack } from '../ui/sheetBack';
import { answerDataQuestion, dropDataQuestion, useDataQuestion } from './dataQuestion';
import { DATA_QUESTION, KEEP_PHONE_VOICE, PLAY_ON_DATA } from './voiceDecision';

export function DataVoiceQuestion() {
  const asking = useDataQuestion();
  // leaving the Reader takes an unanswered question down
  useEffect(() => dropDataQuestion, []);
  return asking ? <DataVoiceCard /> : null;
}

// Mounted only while the question is up, so its history entry exists only then.
function DataVoiceCard() {
  // the floating ? is not drawn over the card (it cannot be asked about)
  useNoDoor();
  useSheetBack(dropDataQuestion);
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={dropDataQuestion}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="Bible voice on mobile data"
        aria-describedby="data-voice-question"
        className="w-full rounded-t-2xl border-t border-line bg-surface px-4 pt-4"
        style={{ paddingBottom: 'var(--lp-bar-inset)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <p id="data-voice-question" className="mb-3 text-base text-fg">
          {DATA_QUESTION}
        </p>
        <div className="flex flex-col gap-2 pb-2">
          <button type="button" onClick={() => answerDataQuestion('david')} className="min-h-12 rounded-xl bg-accent px-4 text-base font-medium text-accent-fg">
            {PLAY_ON_DATA}
          </button>
          <button type="button" onClick={() => answerDataQuestion('phone')} className="min-h-12 rounded-xl border border-line px-4 text-base font-medium text-fg">
            {KEEP_PHONE_VOICE}
          </button>
        </div>
      </div>
    </div>
  );
}
