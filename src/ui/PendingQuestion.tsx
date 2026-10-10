// src/ui/PendingQuestion.tsx — his question as a message, shown from the moment it is sent until its answer comes (mw-5r3p30.121): the Talk sheet's
// pending bubble and the Verse view's Ask box use this one look, so what he said never vanishes while the tutor works.
export function PendingQuestion({ text }: { text: string }) {
  return <p className="ml-auto w-fit max-w-[88%] break-words rounded-2xl bg-accent/15 px-3 py-2 text-lg">{text}</p>;
}
