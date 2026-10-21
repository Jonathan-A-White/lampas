// src/share/findRefs.ts — the Bible references in a shared picture (mw-s1dc0n.2, docs/ask-tutor.md 'Share to Lampas'). A screenshot of a page goes to the mill's
// find-refs grind (grinds/find-refs.json: sonnet, low effort, one picture), cut down on the phone as a talk's pictures are (src/talk/pictures.ts); what comes back
// is {printed, ref} for each reference the page names. The answer is not believed: each one is read again by links.ts and refsInText.ts and dropped when its book
// is not one of the Bible's 66 or its chapter or verse cannot be, and what is left is the same FoundReference the shared words give, so ShareReferences draws both.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { chaptersOf, findReferences, type FoundReference } from '../nav/refsInText';
import { osisOf, parseCanonReference } from '../nav/links';
import { getDeviceKeyBytes } from '../services/deviceKey';
import { askGrind, OFFLINE_MESSAGE, TUTOR_OFFLINE_MESSAGE, TutorError } from '../services/tutor';
import { isTalkPicture, filesOf, preparePicture } from '../talk/pictures';
import { fingerprintOf, keepPictureRefs, keptPictureRefs } from '../data/repositories/pictureRefs';
import type { ShareRow } from '../data/repositories/shares';
import { sharedContentOf } from './shared';

export const FIND_REFS_KIND = 'find-refs';

/** One reference as the grist answers it: the page's words and the OSIS ref (grinds/find-refs.answer.schema.json). */
export interface AnsweredReference {
  printed: string;
  ref: string;
}

export interface FindRefsAnswer {
  references: AnsweredReference[];
}

/** What the grist is sent beside the picture (Find References Request 1): the app's language. */
export const buildFindRefsRequest = (): { language: string } => ({ language: 'en' });

/** The app's own check of an answer, run before it is believed. */
export function isFindRefsAnswer(value: unknown): value is FindRefsAnswer {
  if (typeof value !== 'object' || value === null) return false;
  const { references } = value as { references?: unknown };
  return (
    Array.isArray(references) &&
    references.every((r) => typeof r === 'object' && r !== null && typeof (r as AnsweredReference).printed === 'string' && typeof (r as AnsweredReference).ref === 'string')
  );
}

/** The answer's references that Lampas can place: the book is one of the Bible's, the chapter is in it and the verse is 1 or more. A range written in `printed`
 *  ('Rom 8:28-30') keeps its last verse. Each is written as links.ts writes a ref ('Gen.1.28'), with the page's words. */
export function checkedReferences(answered: readonly AnsweredReference[]): FoundReference[] {
  const found: FoundReference[] = [];
  for (const { printed, ref } of answered) {
    const named = parseCanonReference(ref);
    if (!named || named.chapter === undefined) continue;
    const { book, testament, chapter, verse } = named;
    const limit = chaptersOf(book, testament);
    if (!limit || chapter < 1 || chapter > limit || (verse !== undefined && verse < 1)) continue;
    const words = printed.trim() || ref.trim();
    const range = verse === undefined ? undefined : findReferences(words).find((r) => r.book === book && r.chapter === chapter && r.verse === verse)?.lastVerse;
    found.push({
      printed: words,
      ref: `${osisOf(book)}.${chapter}${verse === undefined ? '' : `.${verse}`}`,
      book,
      testament,
      chapter,
      ...(verse === undefined ? {} : { verse }),
      ...(range === undefined ? {} : { lastVerse: range }),
    });
  }
  return found;
}

/** The references one picture names. A picture read before (the same bytes, whatever the share or the file's name) is answered from the phone, with no grist
 *  (mw-5r3p30.695); one that is read without error is kept by its fingerprint, and one that fails keeps nothing. Throws a TutorError whatever went wrong. */
export async function findRefsInPicture(picture: File, place: number, signal?: AbortSignal): Promise<FoundReference[]> {
  const hash = await fingerprintOf(picture).catch(() => undefined);
  const kept = hash === undefined ? undefined : await keptPictureRefs(hash).catch(() => undefined);
  if (kept) return kept;
  const sent = await preparePicture(picture, place);
  const answer = await askGrind(FIND_REFS_KIND, buildFindRefsRequest(), isFindRefsAnswer, { key: getDeviceKeyBytes(), files: filesOf([sent]), signal, untimed: true });
  const found = checkedReferences(answer.references);
  // a phone that cannot keep it still has the answer to show
  if (hash !== undefined) await keepPictureRefs(hash, found).catch(() => undefined);
  return found;
}

/** Where the reading of a share's pictures stands. */
export type PictureRefs = { status: 'reading' } | { status: 'failed'; line: string; found: FoundReference[] } | { status: 'done'; found: FoundReference[] };

const READING: PictureRefs = { status: 'reading' };

export const FAILED_LINE = 'Could not find Bible references in the picture.';

/** The one line for a picture that could not be read (mw-s1dc0n.13): a phone with no licence says so, a phone or a mill that cannot be reached says that
 *  (the words of the tutor's own offline lines), and anything else blames the picture with `generic`. Every screen that reads a picture with a grist (Share,
 *  the plan's screenshot read) takes its failed line from here (mw-5r3p30.661). */
export function failedLine(err: unknown, generic: string = FAILED_LINE): string {
  if (!(err instanceof TutorError)) return generic;
  if (err.failure === 'no-licence') return 'No licence';
  return err.message === OFFLINE_MESSAGE || err.message === TUTOR_OFFLINE_MESSAGE ? err.message : generic;
}

/** How the readings of a share's pictures ended, one settled result each: what the ones that were read found is kept beside the failure of the others
 *  (mw-s1dc0n.9), so one picture that cannot be read never takes the references of another away. */
export function settledRefs(results: readonly PromiseSettledResult<FoundReference[]>[]): PictureRefs {
  const found = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  const failure = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
  return failure ? { status: 'failed', line: failedLine(failure.reason), found } : { status: 'done', found };
}

/** Reads the pictures of `row` with the grist, one grist each, as soon as `enabled`; `retry` reads them again after a failure. Undefined while there is nothing
 *  to read (no picture, or not enabled): a phone with no licence is not offered the grist. */
export function usePictureRefs(row: ShareRow, enabled: boolean): { refs: PictureRefs | undefined; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  // what a reading ended with, and which row and attempt it was for: any other is still being read
  const [settled, setSettled] = useState<{ row: ShareRow; attempt: number; refs: PictureRefs } | null>(null);
  const pictures = useMemo(() => sharedContentOf(row).files.filter(isTalkPicture), [row]);
  const active = enabled && pictures.length > 0;
  useEffect(() => {
    if (!active) return;
    const stop = new AbortController();
    const settle = (refs: PictureRefs): void => {
      if (!stop.signal.aborted) setSettled({ row, attempt, refs });
    };
    void Promise.allSettled(pictures.map((p, i) => findRefsInPicture(p, i, stop.signal))).then((results) => settle(settledRefs(results)));
    return () => stop.abort();
  }, [active, pictures, row, attempt]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const refs: PictureRefs | undefined = !active ? undefined : settled && settled.row === row && settled.attempt === attempt ? settled.refs : READING;
  return { refs, retry };
}
