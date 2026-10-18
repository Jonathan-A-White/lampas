// src/hardSounds/Word.tsx — a Greek word of a Hard sounds lesson: its letters of the lesson marked, and its speaker (HardSoundLesson.tsx and Contrast.tsx draw it).
import { SpeakButton } from '../speech/SpeakButton';
import { markLetters } from './markLetters';

/** A Greek word, its letters of the lesson marked, and its speaker. */
export function Word({ word, letters, id }: { word: string; letters: readonly string[]; id: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span lang="grc" className="font-greek text-3xl">
        {markLetters(word, letters)}
      </span>
      <SpeakButton text={word} id={id} label={`Hear ${word}`} kind="speaker" />
    </span>
  );
}
