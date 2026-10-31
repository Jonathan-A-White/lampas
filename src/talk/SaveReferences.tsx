// src/talk/SaveReferences.tsx — under a tutor's answer that names two or more Bible references, a quiet 'Save N references as a list' (mw-5r3p30.929, his words of 2026-10-31: 'they should be able to ask you to save
// everything as a verse list'). It opens the Share sheet's own form (src/share/SaveAsList.tsx: where to save, and a name offered from his question) and saves every reference the answer's links stand for,
// in answer order, a run of chapters ('Daniel 10 to 12') as its chapters (src/lists/answerRefs.ts). Open goes to the list and closes the Talk sheet, as a reference card's Open does.
import { useMemo } from 'react';
import { answerReferences } from '../lists/answerRefs';
import { SaveAsList } from '../share/SaveAsList';

export function SaveReferences({ answer, question, onLeave }: { answer: string; question: string; onLeave: () => void }) {
  const refs = useMemo(() => answerReferences(answer), [answer]);
  if (refs.length < 2) return null;
  return (
    <div data-save-references className="mt-2 border-t border-line pt-2">
      <SaveAsList refs={refs} text={question} label={`Save ${refs.length} references as a list`} quiet helper={false} onOpen={onLeave} />
    </div>
  );
}
