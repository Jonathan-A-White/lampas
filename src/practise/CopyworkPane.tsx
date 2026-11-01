// src/practise/CopyworkPane.tsx — Copywork in the Verse view's Practise (mw-5r3p30.899): the language to copy in (VerseView draws the verse in that script in its text box), 'Attach a picture' in the pane
// and, at the foot, the one filled control: 'Take a photo' (the phone's camera), which after a result or a failure says 'Try again'. The picture is judged against the verse's words by the copywork grind and
// what comes back is drawn as the verse with each word marked (JudgedPage.tsx, which Dictation shares).
import { buildCopyworkRequest, COPY_LANGUAGE_NAMES, type CopyLanguage, MAX_COPY_WORDS } from './copywork';
import { JudgedView, PhotoControls, useJudgedPage } from './JudgedPage';

const TOO_LONG_LINE = 'That is a long passage to copy by hand. Open a verse or a shorter passage to practise copywork.';

export interface CopyworkPaneProps {
  /** what he copies: 'John 1:1' */
  reference: string;
  language: CopyLanguage;
  /** the text shown to him to copy (VerseView draws it); its words are what the grind marks */
  text: string;
  /** the foot of the Verse view, where the filled control stands */
  slot: HTMLElement | null;
}

export function CopyworkPane({ reference, language, text, slot }: CopyworkPaneProps) {
  const { state, judge } = useJudgedPage();
  const request = buildCopyworkRequest(reference, language, text);
  const tooLong = request.words.length > MAX_COPY_WORDS;
  const working = state.status === 'working';
  const again = state.status === 'done' || state.status === 'unreadable' || state.status === 'failed';

  return (
    <div data-copywork className="flex flex-col gap-2">
      <p className="px-1 text-sm text-muted">Copy {reference} by hand in {COPY_LANGUAGE_NAMES[language]}, then photograph your page.</p>
      {tooLong ? <p className="px-1 text-sm text-muted">{TOO_LONG_LINE}</p> : null}
      <JudgedView state={state} language={language} />
      <PhotoControls disabled={working || tooLong} label={again ? 'Try again' : 'Take a photo'} onFile={(file) => void judge(file, request)} slot={slot} />
    </div>
  );
}
