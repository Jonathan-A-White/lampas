// src/talk/pictures.ts — the pictures of a tutor talk (mw-y3qno5.1): what a message may carry (the bible-talk grind's attachments, grinds/bible-talk.json:
// up to four JPEG, PNG or WebP files), the cut each picture gets on the phone before it is sent, and what he is told when one is refused.
import type { ClipboardEvent } from 'react';
import { dataUrlOf, PICTURE_ONLY_QUESTION, type Picture } from 'voice-kit/talks';
import { shrinkImage } from '../images/shrink';
import { MILL_PHOTO_MIMES, type MillFile } from '../services/mill';

/** The most pictures one message carries: the grind's `attachments.max`. */
export const TALK_MAX_PICTURES = 4;
/** The kinds of picture the grind takes: its `attachments.mime`, and the kit's photo types (grist.PHOTO_MIMES). */
export const TALK_PICTURE_MIMES: readonly string[] = MILL_PHOTO_MIMES;
/** A picture is cut to this many px on the long edge: enough to read small print in a screenshot, little enough to send. */
export const TALK_MAX_EDGE = 1600;
/** A picture is sent under this many bytes: the grind's `attachments.maxBytes`. */
export const TALK_PICTURE_MAX_BYTES = 1024 * 1024;

// What he asks when he sends pictures and no words, and the picture as a data URL to draw it by, are voice-kit's (@voice-kit/talks, carved from this file).
export { dataUrlOf, PICTURE_ONLY_QUESTION };

export const TOO_MANY_LINE = 'Four pictures at most. The rest were left out.';
export const NOT_A_PICTURE_LINE = 'Only JPEG, PNG or WebP pictures can be sent.';
export const COULD_NOT_USE_LINE = 'That picture could not be used.';
/** Said when more pictures wait in the composer than one message carries: none is cut, he takes one out and sends again. */
export const TOO_MANY_TO_SEND_LINE = 'Four pictures at most. Take one out and send again; nothing has been cut.';

/** A picture ready to send, or kept: its bytes (always JPEG after the cut) and the name it goes under: voice-kit's Picture. */
export type OutgoingPicture = Picture;

/** Whether a file may be sent as a picture: its type is one of the grind's. */
export const isTalkPicture = (file: { type: string }): boolean => TALK_PICTURE_MIMES.includes(file.type);

/** The Composer's refuseFile for a tutor talk: only pictures of the kinds the grind takes go in its waiting row. */
export const refuseNonPicture = (file: { type: string }): string | undefined => (isTalkPicture(file) ? undefined : NOT_A_PICTURE_LINE);

/** The picture as the phone sends it: a JPEG of at most TALK_MAX_EDGE on the long edge and under TALK_PICTURE_MAX_BYTES. */
export async function preparePicture(file: Blob, place: number): Promise<OutgoingPicture> {
  const shrunk = await shrinkImage(file, { maxEdge: TALK_MAX_EDGE, maxBytes: TALK_PICTURE_MAX_BYTES });
  return { bytes: new Uint8Array(await shrunk.arrayBuffer()), mime: 'image/jpeg', name: `picture-${place + 1}.jpg` };
}

/** The pictures the Composer holds (its files: bytes, type and name), each cut down as preparePicture does, in the order they stand; an Error says so when one cannot be used,
 * and the message does not go (the composer keeps its words and pictures). */
export async function preparePictures(files: readonly { bytes: Uint8Array; type: string }[]): Promise<OutgoingPicture[]> {
  const results = await Promise.allSettled(files.map((file, i) => preparePicture(new Blob([file.bytes as BlobPart], { type: file.type }), i)));
  const failed = results.some((r) => r.status === 'rejected');
  if (failed) throw new Error(`${COULD_NOT_USE_LINE} Take it out and send again.`);
  return results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
}

/** The pictures as the grist's files. */
export const filesOf = (pictures: OutgoingPicture[]): MillFile[] => pictures.map(({ bytes, mime, name }) => ({ bytes, mime, name }));

/** The pictures on a paste (a copied screenshot, a copied image): the clipboard's files, else its file items. Empty for text. */
export function pastedPictures(event: ClipboardEvent): File[] {
  const data = event.clipboardData;
  if (!data) return [];
  const files = Array.from(data.files ?? []);
  if (files.length > 0) return files;
  return Array.from(data.items ?? []).flatMap((item) => (item.kind === 'file' ? [item.getAsFile()].filter((f): f is File => f !== null) : []));
}
