// src/talk/BridgeOffer.tsx — the tutor's bridge on screen (mw-1vuvq6.5, docs/ask-tutor.md 'The bridge'): under an answer to a question he is not ready for, the ideas it
// rests on that he lacks (up to three, most important first), the plain line why, and 'Take me there: <title>', which opens the sheet of his next step. The tap is the
// owner's (the Talk sheet's, or the Verse view's answer card's); a spoken yes in a talk does the same (src/talk/offers.ts).
import { useEffect, useState } from 'react';
import type { Chapter, GreekWord } from '../data/chapter';
import type { Bridge } from '../data/db';
import { ideaOf } from '../data/grammar/ladder';
import { IdeaSheet } from '../IdeaSheet';
import { WordSheet } from '../WordSheet';
import { bridgeButtonText, closeBridgeIdea, useBridgeIdea, type BridgeOwner } from './offers';

export function BridgeOffer({ bridge, onTake }: { bridge: Bridge; onTake: () => void }) {
  return (
    <div data-bridge-offer className="mt-2 border-t border-line pt-2">
      <p className="text-sm text-muted">{bridge.many ? 'You are missing quite a bit for this. The top three:' : 'This rests on'}</p>
      <ul data-bridge-missing className="list-disc pl-6 text-lg">
        {bridge.ideas.map((id) => (
          <li key={id}>{ideaOf(id).title}</li>
        ))}
      </ul>
      {bridge.many ? <p className="text-base text-muted">…and more behind them.</p> : null}
      <p className="mt-1 break-words text-base">{bridge.why}</p>
      <button type="button" data-bridge-take onClick={onTake} className="mt-1 min-h-11 rounded-lg border border-accent px-4 text-base font-medium text-accent active:bg-line">
        {bridgeButtonText(bridge)}
      </button>
    </div>
  );
}

/** Draws the idea sheet a bridge opened for `owner`, over its screen, and the word sheet of an example tapped on it. Done or Back closes the idea sheet and the talk (or
 * the card) is under it as it was. */
export function BridgeIdeaHost({ owner }: { owner: BridgeOwner }) {
  const ideaId = useBridgeIdea(owner);
  const [word, setWord] = useState<{ chapter: Chapter; word: GreekWord } | null>(null);
  // the screen going away takes the sheet with it
  useEffect(() => () => closeBridgeIdea(owner), [owner]);
  return (
    <>
      {ideaId ? (
        <IdeaSheet
          idea={ideaOf(ideaId)}
          onClose={() => closeBridgeIdea()}
          covered={word !== null}
          onWord={(chapter, tapped) => {
            // the word sheet opens over the idea sheet, which stays: Back closes one sheet at a time (mw-5r3p30.378)
            setWord({ chapter, word: tapped });
          }}
        />
      ) : null}
      {word ? <WordSheet chapter={word.chapter} lookup={{ words: [word.word], fromEnglish: false }} onClose={() => setWord(null)} /> : null}
    </>
  );
}
