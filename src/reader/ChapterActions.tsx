// src/reader/ChapterActions.tsx — what a chapter offers at its foot, before the chapter buttons: the Maps door (src/maps/MapsDoor.tsx, mw-zbjgn3r.2), drawn only while the chapter has maps
// and never with the Immersive reader On. Read in Logos and Listen in Audible are not here: his word (2026-11-03, mw-5r3p30.1008) is that they live on the view a verse, a passage or a
// chapter opens (the Verse view: In Logos in its Tools line, Listen in Audible under Listen), in both Testaments; an Old Testament chapter's foot once had them (mw-uqlxea.2, mw-5r3p30.496).
import { MapsDoor } from '../maps/MapsDoor';

/** The foot of a chapter: the Maps door, every chapter's, and the Immersive reader draws none. */
export function ChapterActions({ code, chapter, immersive }: { code: string; chapter: number; immersive: boolean }) {
  return immersive ? null : <MapsDoor mapRef={{ book: code, chapter }} className="mx-3 mt-4 w-fit" />;
}
