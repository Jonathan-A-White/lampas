// src/TeachTiles.tsx — the tiles at the top of an idea sheet of the letters, sounds and marks tiers (mw-5r3p30.232, src/data/grammar/teachTiles.ts): each item
// as a tile you can look at and hear. A letter is one tap that says it (its capital and small, the sound in the chosen pronunciation, the vowels marked) and its
// name opens the item's own sheet; a pair or a mark shows the form, its sound or what it is, and a New Testament word with its own play button. Four across for
// the alphabet (a long sound shows as the quick round shows it, up to the first semicolon; the tiles stay 44 px or more at 390 px, held upright or sideways), two for tiles with a word to carry.
import { useEffect, useRef, useState } from 'react';
import { shortSound } from './data/grammar/quickRound';
import type { TeachTile } from './data/grammar/teachTiles';
import { hasGreekVoice, isWordSaid, noVoiceHelp, speakLetter, speakWord, stopSpeaking, warmVoices } from './speech/greek';
import { SpeakButton } from './speech/SpeakButton';

const HELP_MS = 7000;
const GREEK = 'font-greek';

/** What a tile with a letter or a word to say is called to a screen reader: 'Hear alpha', 'Hear ἡ'. */
const hearLabel = (tile: TeachTile): string => `Hear ${tile.say?.as === 'letter' ? (tile.name ?? tile.form) : tile.say?.text}`;

function Face({ tile }: { tile: TeachTile }) {
  return (
    <>
      <span lang="grc" className={`${GREEK} block ${[...tile.form].length === 1 ? 'text-4xl' : 'text-2xl'} leading-tight`}>
        {tile.form}
      </span>
      {tile.vowel ? <span className="block text-xs font-medium text-accent">vowel</span> : null}
      {tile.sound ? (
        <span data-sound className="block text-xs leading-snug text-muted">
          {shortSound(tile.sound)}
        </span>
      ) : null}
      {tile.note ? <span className="block text-xs leading-snug text-muted">{tile.note}</span> : null}
    </>
  );
}

function Tile({ tile, onOpen, onSay }: { tile: TeachTile; onOpen: (ideaId: string) => void; onSay: (tile: TeachTile) => void }) {
  const { ideaId, name, example, say } = tile;
  return (
    <li
      data-testid="teach-tile"
      data-id={tile.id}
      data-name={name ?? tile.form}
      data-vowel={tile.vowel ? '' : undefined}
      className={`flex min-w-0 flex-col rounded-xl border ${tile.vowel ? 'border-accent' : 'border-line'}`}
    >
      {say ? (
        <button type="button" aria-label={hearLabel(tile)} onClick={() => onSay(tile)} className="min-h-11 min-w-0 flex-1 rounded-t-xl px-1 pt-1 text-center active:bg-line">
          <Face tile={tile} />
        </button>
      ) : (
        <div className="min-h-11 min-w-0 flex-1 px-1 pt-1 text-center">
          <Face tile={tile} />
        </div>
      )}
      {example ? (
        <div className="flex items-center justify-center gap-1 px-1">
          <span className="min-w-0 text-center text-sm">
            <span lang="grc" className={`${GREEK} text-lg`}>
              {example.word}
            </span>
            <span className="block text-xs text-muted">{example.gloss}</span>
          </span>
          <SpeakButton text={example.word} id={`tile:${example.word}`} label={`Hear ${example.word}`} kind="speaker" className="shrink-0" />
        </div>
      ) : null}
      {name && ideaId ? (
        <button type="button" aria-label={`About ${name}`} onClick={() => onOpen(ideaId)} className="min-h-11 rounded-b-xl px-1 text-center text-sm text-accent underline decoration-1 underline-offset-2 active:bg-line">
          {name}
        </button>
      ) : name ? (
        <p className="px-1 pb-1 text-center text-sm">{name}</p>
      ) : null}
    </li>
  );
}

/** `onOpen` is asked for the idea sheet of a tile that has one. */
export function TeachTiles({ tiles, onOpen }: { tiles: TeachTile[]; onOpen: (ideaId: string) => void }) {
  const [help, setHelp] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    void warmVoices();
    return () => {
      clearTimeout(timer.current);
      if (isWordSaid()) stopSpeaking();
    };
  }, []);
  // a tile with nothing but a letter or a short word to say is narrow; one that carries a word or a note needs two across
  const narrow = tiles.every((t) => !t.example && !t.note);

  const say = (tile: TeachTile): void => {
    if (!tile.say) return;
    // with no Greek voice the phone would say it in another one: nothing is spoken and the help says where to get one (as a speaker button does)
    if (hasGreekVoice() === false || !(tile.say.as === 'letter' ? speakLetter(tile.say.text) : speakWord(tile.say.text, 'greek'))) {
      setHelp(noVoiceHelp());
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setHelp(null), HELP_MS);
      return;
    }
    setHelp(null);
  };

  return (
    <>
      <ul data-testid="teach-tiles" className={`mt-3 grid gap-2 ${narrow ? 'grid-cols-4' : 'grid-cols-2 min-[640px]:grid-cols-4'}`}>
        {tiles.map((tile) => (
          <Tile key={tile.id} tile={tile} onOpen={onOpen} onSay={say} />
        ))}
      </ul>
      {help ? (
        <p
          role="status"
          className="pointer-events-none fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-20 rounded-xl border border-line bg-surface px-4 py-3 text-base text-fg shadow-lg"
        >
          {help}
        </p>
      ) : null}
    </>
  );
}
