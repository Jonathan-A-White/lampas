// src/markdown/DrillReference.tsx — the Bible reference a drill or quiz question shows (mw-5r3p30.876), drawn the one way for every kind: plain text while `linked` is false, so
// it gives nothing away before he has answered, and a ReferenceLink once it is true, a tap on which opens the verse card in place with `mark` (the answered Greek or Hebrew word) marked.
// Review's word and grammar questions, Drill it, the Parsing drill and the Quick test all use it; the card closes back to the question with its answer and Next where they were.
import { ReferenceLink } from './ReferenceCard';

const LINK = 'inline-flex min-h-11 items-center text-accent underline underline-offset-4';

export function DrillReference({ reference, mark, linked, className = LINK }: { reference: string; mark?: string; linked: boolean; className?: string }) {
  if (!linked) return <>{reference}</>;
  return (
    <ReferenceLink written={reference} mark={mark} className={className}>
      {reference}
    </ReferenceLink>
  );
}
