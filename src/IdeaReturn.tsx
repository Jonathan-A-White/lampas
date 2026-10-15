// src/IdeaReturn.tsx — opens the idea sheet again when Back brings him from a table to where the sheet was (src/ideaReturn.ts, mw-svw421.5). The sheet comes back on
// its own, over the screen it was over, with its examples' word sheet like the Goal screen's; the sheets under it (the word and the Grammar sheet of the Reader) are not
// brought back. Back then closes it, as it closes any sheet.
import { useEffect, useState } from 'react';
import type { Chapter, GreekWord } from './data/chapter';
import { ideaOf } from './data/grammar/ladder';
import { dropHeldIdea, holdStillWanted, useReturnedIdea } from './ideaReturn';
import { IdeaSheet } from './IdeaSheet';
import { useAddress } from './nav/route';
import { WordSheet, type Lookup } from './WordSheet';

export function IdeaReturn() {
  const returned = useReturnedIdea();
  const address = useAddress();
  // the sheet, once it is back, is the screen's own: its entry in history makes the hold look as if he had left, so it is taken up and the hold let go at once
  const [ideaId, setIdeaId] = useState<string | null>(null);
  if (returned && returned !== ideaId) setIdeaId(returned);
  useEffect(() => {
    if (returned) dropHeldIdea();
  }, [returned]);
  const [word, setWord] = useState<{ chapter: Chapter; lookup: Lookup } | null>(null);
  // he went somewhere that is neither the table nor the screen the sheet was over: the hold is no longer his
  useEffect(() => {
    if (!holdStillWanted()) dropHeldIdea();
  }, [address]);
  if (!ideaId) return null;
  return (
    <>
      <IdeaSheet
        idea={ideaOf(ideaId)}
        onClose={() => setIdeaId(null)}
        covered={word !== null}
        onWord={(chapter: Chapter, tapped: GreekWord) => setWord({ chapter, lookup: { words: [tapped], fromEnglish: false } })}
      />
      {word ? <WordSheet chapter={word.chapter} lookup={word.lookup} onClose={() => setWord(null)} /> : null}
    </>
  );
}
