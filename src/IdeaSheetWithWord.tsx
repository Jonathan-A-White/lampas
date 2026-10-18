// src/IdeaSheetWithWord.tsx — the idea sheet for one idea with the word sheet that its examples open over it (mw-5r3p30.604): a screen that lists ideas by title
// (Settings > Grammar approach) keeps only the id of the idea tapped and draws this. The word sheet opens over the idea sheet, which stays: Back closes one sheet
// at a time (mw-5r3p30.378).
import { useState } from 'react';
import type { Chapter, GreekWord } from './data/chapter';
import { ideaOf } from './data/grammar/ladder';
import { IdeaSheet } from './IdeaSheet';
import { WordSheet, type Lookup } from './WordSheet';

export function IdeaSheetWithWord({ ideaId, onClose }: { ideaId: string; onClose: () => void }) {
  const [word, setWord] = useState<{ chapter: Chapter; lookup: Lookup } | null>(null);
  return (
    <>
      <IdeaSheet
        idea={ideaOf(ideaId)}
        onClose={onClose}
        covered={word !== null}
        onWord={(chapter: Chapter, tapped: GreekWord) => setWord({ chapter, lookup: { words: [tapped], fromEnglish: false } })}
      />
      {word ? <WordSheet chapter={word.chapter} lookup={word.lookup} onClose={() => setWord(null)} /> : null}
    </>
  );
}
