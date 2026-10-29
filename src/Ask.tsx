// src/Ask.tsx — the Verse view's 'Ask the tutor' action (src/VerseView.tsx): the composer that asks (mw-5r3p30.842: the question goes to the Talk sheet, the one tutor of every door;
// the answer, its wait and its failure are the Talk sheet's, src/Talk.tsx, not cards of this view). AskComposer is voice-kit's Composer (Hold to ask, Type a question; mw-jtzpw0.3), drawn at the foot of the view.
import { Composer, type ComposerLabels, type ComposerMessage } from 'voice-kit/composer';
import { useEffect, useRef, type FormEvent } from 'react';
import type { Verse } from './data/chapter';
import { unitId } from './data/passage';
import { askBySetting } from './settings/definitions';
import { useSetting } from './settings/store';
import { MAX_QUESTION_CHARS } from './services/tutor';
import type { AskState } from './pending/pendingAsks';
import { askTranscriber } from './speech/askTranscriber';
import { tapWord, useTalkSettings } from './talkSettings';
import { preparePictures, refuseNonPicture, TALK_MAX_PICTURES, TOO_MANY_TO_SEND_LINE, PICTURE_ONLY_QUESTION, type OutgoingPicture } from './talk/pictures';
import { askDraftKey, readDraft, writeDraft } from './ui/unsentDraft';

/** The composer for `verse` (or a passage, src/data/passage.ts): voice-kit's Composer, speak-first or, by the setting Ask by, type-first, drawn at the foot of the Verse view. Hold to ask streams
 * his words as he speaks and a release asks; Type a question brings out the field and Send asks the Talk sheet's tutor, with the pictures in the row (Attach a picture, Take a photo, mw-5r3p30.760).
 * There is no standing makers button here: a wish the app cannot meet is offered to the makers by the tutor in the talk (src/talk/offers.ts, mw-5r3p30.844). Words typed or pasted and not sent are kept for the verse and put back when the
 * composer opens again (src/ui/unsentDraft.ts, mw-5r3p30.495). */
export function AskComposer({ book, chapter, verse, state, onAsk, prefill = null }: {
  book: string;
  chapter: number;
  verse: Verse;
  state: AskState | undefined;
  onAsk: (verse: Verse, question: string, pictures?: OutgoingPicture[]) => void;
  /** a question to put in the field when the composer opens on that verse (the Parsing drill's link); he sends it himself */
  prefill?: { verse: number; text: string } | null;
}) {
  const askBy = useSetting(askBySetting) ?? 'speaking';
  const talkSettings = useTalkSettings();
  const busy = state?.phase === 'sending' || state?.phase === 'waiting';
  const prefilled = verse.to === undefined && prefill?.verse === verse.n ? prefill.text : '';
  // The Composer holds its words itself and says nothing of them until Send, so the draft is read off its field: from what he types or pastes (input bubbles
  // up to the section), and, for words a hold left in the field, when the composer goes away. A sent question clears the draft and the field is not read again.
  const draftKey = askDraftKey(book, chapter, unitId(verse));
  const section = useRef<HTMLElement>(null);
  const sent = useRef(false);
  const keep = (field: HTMLTextAreaElement | null): void => {
    if (field && !sent.current) writeDraft(draftKey, field.value);
  };
  const onInput = (e: FormEvent<HTMLElement>): void => {
    if (e.target instanceof HTMLTextAreaElement) {
      sent.current = false;
      keep(e.target);
    }
  };
  useEffect(() => {
    const box = section.current;
    return () => keep(box?.querySelector('textarea') ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);
  const send = async ({ text, files }: ComposerMessage): Promise<boolean> => {
    const question = text.trim();
    if ((!question && files.length === 0) || busy) return false;
    if (question.length > MAX_QUESTION_CHARS) throw new Error(`${question.length} of ${MAX_QUESTION_CHARS}: the question is too long to send. Shorten it; nothing has been cut.`);
    if (files.length > TALK_MAX_PICTURES) throw new Error(TOO_MANY_TO_SEND_LINE);
    // the pictures are cut down first (an Error says which could not be used, and the row keeps them); a message of pictures alone asks what the pictures say
    const pictures = await preparePictures(files);
    onAsk(verse, question || PICTURE_ONLY_QUESTION, pictures);
    sent.current = true;
    writeDraft(draftKey, '');
    return true;
  };
  return (
    <section ref={section} aria-label="Ask the tutor" data-ask={unitId(verse)} onInput={onInput}>
      <Composer
        key={unitId(verse)}
        mode={askBy === 'typing' ? 'type' : 'speak'}
        settings={{ ...talkSettings, attach: true, camera: true }}
        refuseFile={refuseNonPicture}
        transcriber={askTranscriber}
        lang="en-US"
        appName="Lampas"
        labels={{ ...ASK_LABELS, hold: tapWord('Hold to ask', talkSettings.talk) }}
        initialText={prefilled || readDraft(draftKey)}
        disabled={busy}
        onSend={send}
      />
    </section>
  );
}

/** The composer's words for asking the tutor. */
const ASK_LABELS: Partial<ComposerLabels> = {
  hold: 'Hold to ask', // tapWord makes it Tap to ask while Talk is Tap
  typeInstead: 'Type a question',
  placeholder: 'Type a question',
  message: 'Your question',
  speak: 'Ask by speaking',
  attach: 'Attach a picture',
  camera: 'Take a photo',
  toSend: 'Pictures to send',
};
