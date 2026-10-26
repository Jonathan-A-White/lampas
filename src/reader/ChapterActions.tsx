// src/reader/ChapterActions.tsx — what a chapter offers at its foot, before the chapter buttons: for every chapter the Maps door (src/maps/MapsDoor.tsx, mw-zbjgn3r.2), drawn only while the chapter has maps
// and never with the Immersive reader On; and, for an Old Testament chapter, what it offers outside Lampas (mw-uqlxea.2, docs/layout/reader.md
// 'An Old Testament chapter (English only)'): Read in Logos (the chapter in the Bible he chose in Settings, src/resources/logosBible.ts) and Listen in Audible (The Word of Promise,
// src/resources/audioBible.ts), each only while its setting is on. The two ways out the chapter picker once offered under its grid (mw-5r3p30.496), now actions on the opened chapter.
// Nothing leaves the app until he taps one; the Audible link is made again at the tap (src/resources/oldTestamentChoices.ts).
import { useLiveQuery } from 'dexie-react-hooks';
import { isHebrewBook } from '../data/books';
import { getLogosBible } from '../data/repositories';
import { getStudyResources } from '../data/repositories/resources';
import { MapsDoor } from '../maps/MapsDoor';
import { SendOff } from '../plan/SendOff';
import { useSendOff } from '../plan/useSendOff';
import { audioBibleOf } from '../resources/audioBible';
import { oldTestamentChoices } from '../resources/oldTestamentChoices';
import { armFallback } from '../resources/openApp';
import { audioBibleSetting } from '../settings/definitions';
import { useSetting } from '../settings/store';

const ROW = 'flex min-h-12 items-center rounded-lg bg-surface px-3 text-base font-medium text-accent active:bg-line';

/** The foot of a chapter. The Logos and Audible actions are the Old Testament's (its text is English only); the Maps door is every chapter's, and the Immersive reader draws none. */
export function ChapterActions({ name, code, chapter, immersive }: { name: string; code: string; chapter: number; immersive: boolean }) {
  return (
    <>
      {isHebrewBook(code) ? <OutsideActions name={name} code={code} chapter={chapter} /> : null}
      {immersive ? null : <MapsDoor mapRef={{ book: code, chapter }} className="mx-3 mt-4 w-fit" />}
    </>
  );
}

function OutsideActions({ name, code, chapter }: { name: string; code: string; chapter: number }) {
  const resources = useLiveQuery(getStudyResources, []);
  const bible = useLiveQuery(getLogosBible, []);
  const audioId = useSetting(audioBibleSetting);
  const sendOff = useSendOff();
  if (!resources || bible === undefined || audioId === undefined) return null;
  const audio = audioBibleOf(audioId);
  const { logos, audible } = oldTestamentChoices(code, chapter, { logosOn: resources.on.includes('logos'), logosBible: bible, audio });
  if (!logos && !(audio && audible)) return null;
  return (
    <div role="group" data-chapter-actions aria-label={`${name} ${chapter}: read or listen`} className="mx-3 mt-6 flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
      {logos ? (
        <a href={logos.href} data-fallback={logos.fallback} onClick={() => armFallback(logos.fallback)} className={ROW}>
          Read in Logos
        </a>
      ) : null}
      {audio && audible ? (
        <div>
          <a
            href={audible.href}
            aria-label={`Listen in Audible: ${audio.name}, ${audible.label}`}
            onClick={(e) => sendOff.tap(e, { audio, code, chapter })}
            className={ROW}
          >
            Listen in Audible
          </a>
          <p className="px-1 pt-2 text-base">{`In Audible: Chapters > ${audible.label}`}</p>
          <p className="px-1 pt-1 text-sm text-muted">{audio.credit}</p>
          <SendOff send={sendOff} />
        </div>
      ) : null}
    </div>
  );
}
