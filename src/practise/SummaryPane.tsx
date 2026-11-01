// src/practise/SummaryPane.tsx — Summary in the Verse view's Practise (mw-5r3p30.902): the verse, passage or chapter is shown in English in the view's text box to read first, then he gives its main points in a few
// sentences: typed in the box ('Your summary', then the foot's 'Check my summary'), or written by hand and photographed ('Attach a picture' in the pane, the foot's 'Take a photo'). The summary grind
// (summary.ts) answers with the main points present and missing in the passage's order, whether he kept that order, whether the length is right, one sentence of a model summary to compare and one piece of
// advice; a photo is read by the tutor and its reading is put in the box, where he can correct it and check it again. The summary and the answer are kept in the PracticeState. Summary is in English only: the line at the top says so.
import { useEffect, useRef, useState } from 'react';
import { getDeviceKeyBytes } from '../services/deviceKey';
import { askGrind, TutorError } from '../services/tutor';
import { filesOf, isTalkPicture, NOT_A_PICTURE_LINE, preparePicture } from '../talk/pictures';
import { FOOT, PhotoControls, QUIET } from './JudgedPage';
import { buildSummaryRequest, isSummaryAnswer, type Summarised, type SummaryAnswer, SUMMARY_KIND, summaryRefusal, typedSummary } from './summary';

const SCOPE_LINE = 'Summary is in English. A summary in Greek or Hebrew is not offered yet.';
const WORKING_LINE = 'The tutor is reading your summary…';
const UNREADABLE_LINE = 'The tutor could not read your page.';

const LENGTH_LINE: Record<SummaryAnswer['length'], string> = {
  right: 'The length is right: a few sentences that keep the main points.',
  too_long: 'Your summary is too long: a summary keeps only the main points.',
  too_short: 'Your summary is too short to show the main points.',
};

export interface SummaryPaneProps {
  /** what he summarises: 'John 1:1', 'John 1:1-5', 'John 1:1-51' */
  reference: string;
  /** the verse, passage or chapter in English: what the grind compares his summary with */
  passage: string;
  /** what he gave, as he wrote it, and the tutor's answer once it has come; undefined before he has given anything */
  summary: Summarised | undefined;
  onSummary: (next: Summarised) => void;
  /** the foot of the Verse view, where the one filled control stands */
  slot: HTMLElement | null;
}

/** The points of the passage in a numbered list, or the line to say when there are none. */
function Points({ title, points, none, mark }: { title: string; points: string[]; none: string; mark: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted">{title}</p>
      {points.length > 0 ? (
        <ol {...{ [mark]: '' }} className="list-decimal ps-5 text-base">
          {points.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ol>
      ) : (
        <p className="text-base">{none}</p>
      )}
    </div>
  );
}

function Result({ answer }: { answer: SummaryAnswer }) {
  if (!answer.readable) {
    return (
      <div data-summary-result className="flex flex-col gap-1 px-1">
        <p className="text-base">{UNREADABLE_LINE}</p>
        <p data-summary-advice className="text-base font-medium">
          {answer.advice}
        </p>
      </div>
    );
  }
  return (
    <div data-summary-result className="flex flex-col gap-2 px-1">
      <div>
        <Points title="Main points you gave" points={answer.present} none="None of the main points yet." mark="data-summary-present" />
        {answer.present.length > 1 ? (
          <p data-summary-order className="text-sm text-muted">
            {answer.in_order ? "You kept the passage's order." : 'You gave these in a different order from the passage.'}
          </p>
        ) : null}
      </div>
      <Points title="Main points you left out" points={answer.missing} none="Nothing: you gave every main point." mark="data-summary-missing" />
      <p data-summary-length data-length={answer.length} className="text-base">
        {LENGTH_LINE[answer.length]}
      </p>
      <div>
        <p className="text-sm font-medium text-muted">A model summary to compare</p>
        <p data-summary-model lang="en" className="text-base">
          {answer.model_summary}
        </p>
      </div>
      <p data-summary-advice className="text-base font-medium">
        {answer.advice}
      </p>
    </div>
  );
}

export function SummaryPane({ reference, passage, summary, onSummary, slot }: SummaryPaneProps) {
  const [draft, setDraft] = useState(summary?.text ?? '');
  const [asking, setAsking] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const stop = useRef<AbortController | null>(null);
  const latest = useRef({ onSummary, reference, passage });
  useEffect(() => {
    latest.current = { onSummary, reference, passage };
  });
  useEffect(() => () => stop.current?.abort(), []);

  /** Asks the grind about the typed text, or about the picture of his page (the text is then what the tutor read there). */
  async function ask(given: { how: 'typed'; text: string } | { how: 'photo'; file: File }) {
    const { onSummary: keep, reference: about, passage: verse } = latest.current;
    const how = given.how;
    if (given.how === 'photo' && !isTalkPicture(given.file)) {
      setFailure(NOT_A_PICTURE_LINE);
      return;
    }
    const text = given.how === 'typed' ? given.text : '';
    keep({ how, text, answer: null });
    const refusal = summaryRefusal(verse, text);
    if (refusal) {
      setFailure(refusal);
      return;
    }
    stop.current?.abort();
    const controller = new AbortController();
    stop.current = controller;
    setFailure(null);
    setAsking(true);
    // a photographed page takes the place of what was typed: it comes back in the box as the tutor read it
    if (given.how === 'photo') setDraft('');
    try {
      const request = given.how === 'typed' ? buildSummaryRequest(about, verse, { how: 'typed', text }) : buildSummaryRequest(about, verse, { how: 'photo' });
      const files = given.how === 'photo' ? filesOf([await preparePicture(given.file, 0)]) : undefined;
      const answer = await askGrind(SUMMARY_KIND, request, isSummaryAnswer, { key: getDeviceKeyBytes(), ...(files ? { files } : {}), signal: controller.signal, untimed: true });
      if (controller.signal.aborted) return;
      const written = given.how === 'photo' ? (answer.readable ? typedSummary(answer.read_as) : '') : text;
      if (given.how === 'photo' && answer.readable) setDraft(written);
      latest.current.onSummary({ how, text: written, answer });
    } catch (err) {
      if (controller.signal.aborted) return;
      setFailure(err instanceof TutorError ? err.message : err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      if (!controller.signal.aborted) setAsking(false);
    }
  }

  const answer = summary?.answer ?? null;
  const typed = typedSummary(draft);
  // the box holds something the tutor has not been asked about yet (nothing asked, an ask that failed, or the box changed since)
  const unchecked = typed !== '' && (!answer || typed !== typedSummary(summary?.text ?? ''));
  const again = summary?.how === 'photo' && (answer !== null || failure !== null);
  return (
    <div data-summary className="flex flex-col gap-2">
      <p data-summary-scope className="px-1 text-sm text-muted">
        {SCOPE_LINE}
      </p>
      <p className="px-1 text-sm text-muted">
        Read {reference}, then give its main points in a few sentences: type them below, or write them by hand and photograph your page. The tutor says which main points you gave and which you left out.
      </p>
      <textarea
        aria-label="Your summary"
        lang="en"
        rows={4}
        value={draft}
        disabled={asking}
        onChange={(e) => setDraft(e.target.value)}
        className="mx-1 rounded-lg border border-line bg-surface px-2 py-1 text-base"
      />
      {summary?.how === 'photo' && answer?.readable ? (
        <p data-summary-read className="px-1 text-sm text-muted">
          The tutor read this on your page. If it read a word wrong, correct it above and check it again.
        </p>
      ) : null}
      {asking ? (
        <p role="status" className="px-1 text-base">
          {WORKING_LINE}
        </p>
      ) : null}
      {failure ? (
        <div className="flex flex-col items-start gap-1 px-1">
          <p role="alert" className="text-base">
            {failure}
          </p>
          {unchecked ? (
            <button type="button" onClick={() => void ask({ how: 'typed', text: typed })} className={QUIET}>
              Try again
            </button>
          ) : null}
        </div>
      ) : null}
      {answer && !asking ? <Result answer={answer} /> : null}
      <PhotoControls
        disabled={asking}
        label={again ? 'Try again' : 'Take a photo'}
        onFile={(file) => void ask({ how: 'photo', file })}
        slot={slot}
        foot={
          unchecked ? (
            <button type="button" disabled={asking} onClick={() => void ask({ how: 'typed', text: typed })} className={FOOT}>
              Check my summary
            </button>
          ) : undefined
        }
      />
    </div>
  );
}
