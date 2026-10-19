// src/talk/QuestionRow.tsx — his question in the Talk sheet with its Copy: the sent turn's and the one still waiting for its answer draw this one row (mw-5r3p30.489), so the Copy
// is where it will stay when the answer lands. Sideways it sits beside the question, not under it, so the answer keeps its room (tests/e2e/talk-landscape.spec.ts).
import { CopyText } from '../share/CopyText';

export function QuestionRow({ shown, copyText }: { /** the words on the bubble: the tutor's cleaned question when it gave one */ shown: string; /** what Copy puts on the clipboard: his own words */ copyText: string }) {
  return (
    <div className="space-y-2 short:flex short:items-start short:justify-end short:gap-2 short:space-y-0">
      <p data-talk-q className="ml-auto w-fit max-w-[88%] break-words rounded-2xl bg-accent/15 px-3 py-2 text-lg short:ml-0 short:min-w-0">
        {shown}
      </p>
      <div className="short:shrink-0">
        <CopyText text={copyText} label="Copy my question" />
      </div>
    </div>
  );
}
