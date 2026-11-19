// src/AddWordButton.tsx — the one Add to my words control (mw-5r3p30.1203): the tutor's button under an explained word (Talk.tsx) and the word sheet's carry this same component, so they look, read and write alike.
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { languageOfLemma } from './data/lemma';
import { addWordToLearn, wordIsListed } from './data/repositories';
import type { TalkScope } from './services/talk';
import { addWord } from './tutor/registry';

/**
 * Add to my words under a word: puts its lemma on his words-to-learn list (the tutor's add-word command, which an answer's
 * words_to_add and the Goal screen use too); once it is there the button reads On my list and is disabled. `gloss` is the chapter's
 * meaning for a word the lexicon lacks, which still goes in with it, as he asked. A lemma the Septuagint's derivation only guessed is
 * not put on his list, and the line under the button says why (mw-u2w5klk.16).
 */
export function AddWord({ scope, lemma, gloss }: { scope: TalkScope; lemma: string; gloss: string }) {
  const listed = useLiveQuery(() => wordIsListed(lemma), [lemma]);
  const [busy, setBusy] = useState(false);
  const [guessed, setGuessed] = useState(false);
  if (listed === undefined) return null;
  const add = async (): Promise<void> => {
    setBusy(true);
    try {
      const { result } = await addWord(scope, lemma);
      if (result === 'unknown') await addWordToLearn(lemma, gloss, Date.now(), '', languageOfLemma(lemma));
      setGuessed(result === 'ignored');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button
        type="button"
        data-add-word={lemma}
        disabled={listed || busy}
        onClick={() => void add()}
        className={`mt-1 block min-h-11 rounded-lg border px-3 text-base font-medium ${listed ? 'border-line text-muted' : 'border-accent text-accent active:bg-line'}`}
      >
        {listed ? 'On my list' : 'Add to my words'}
      </button>
      {guessed && !listed ? (
        <p role="status" data-add-word-why={lemma} className="mt-1 text-base text-muted">
          Not added: Lampas only guessed this word, and a guessed word is not learned until it is checked.
        </p>
      ) : null}
    </>
  );
}
