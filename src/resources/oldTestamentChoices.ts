// src/resources/oldTestamentChoices.ts — what an Old Testament chapter offers in the chapter picker before it leaves the app (mw-5r3p30.496): Lampas has
// no Old Testament text, so a chapter is read in his Bible in Logos or listened to in The Word of Promise in Audible, each only while its setting is on.
// Pure: the picker hands it the settings; the Audible link is made again at the tap (Audible wants the time of the tap, see audioBible.ts).
import { type AudibleListen, type AudioBible, audibleChapterLabel, audibleListen } from './audioBible';
import { chapterLink } from './logosBible';

export interface ChapterChoices {
  /** Read in Logos: the chapter's Logos link, as the picker has always made it; absent with Logos off or a chapter Logos has no link for */
  logos?: { href: string; fallback: string };
  /** Listen in Audible: the link, with Audible's own name for the chapter ('Judges 3') to pick in the list; absent with the Audio Bible off */
  audible?: AudibleListen & { label: string };
}

export function oldTestamentChoices(
  code: string,
  chapter: number,
  on: { logosOn: boolean; logosBible: string; audio: AudioBible | undefined; now?: number },
): ChapterChoices {
  const link = on.logosOn ? chapterLink(code, chapter, on.logosBible) : undefined;
  const label = on.audio ? audibleChapterLabel(code, chapter) : undefined;
  return {
    logos: link ? { href: link.url, fallback: link.fallback } : undefined,
    audible: on.audio && label !== undefined ? { ...audibleListen(on.audio, code, chapter, on.now), label } : undefined,
  };
}
