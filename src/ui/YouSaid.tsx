// src/ui/YouSaid.tsx — his own words under the tutor's cleaned-up question (mw-5r3p30.308): a question he spoke comes back as the tutor tidied it (Greek in Greek letters, no ums),
// and the answer says how it took his words ('I took "technia" as Τεκνία'), so what he said stays on screen to read against. A typed question, and a spoken one the tutor
// left as it was, show nothing. The Talk sheet's turns and the Verse view's answer cards use this one line.

const alike = (a: string, b: string): boolean => a.trim().replace(/\s+/g, ' ').toLowerCase() === b.trim().replace(/\s+/g, ' ').toLowerCase();

export function YouSaid({ spoken, said, shown }: { /** the question was spoken (src/speech/spoken.ts wasSpoken when it was sent) */ spoken?: boolean; /** his words, as the recogniser gave them */ said: string; /** the question as the tutor cleaned it, shown as the heading, when it gave one */ shown?: string }) {
  if (!spoken || !shown || alike(said, shown)) return null;
  return (
    <p data-you-said className="break-words text-sm text-muted">
      You said: {said}
    </p>
  );
}
