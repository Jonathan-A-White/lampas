// src/talk/pictures.ts — the pictures of a tutor talk (mw-y3qno5.1): what a message may carry (the bible-talk grind's attachments, grinds/bible-talk.json:
// up to four JPEG, PNG or WebP files), the cut each picture gets on the phone before it is sent, and what he is told when one is refused.
import type { grist } from 'bsv-kit/grist';
import type { ClipboardEvent } from 'react';
import { shrinkImage } from '../images/shrink';

/** The most pictures one message carries: the grind's `attachments.max`. */
export const TALK_MAX_PICTURES = 4;
/** The kinds of picture the grind takes: its `attachments.mime`. */
export const TALK_PICTURE_MIMES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];
/** A picture is cut to this many px on the long edge: enough to read small print in a screenshot, little enough to send. */
export const TALK_MAX_EDGE = 1600;
/** A picture is sent under this many bytes: the grind's `attachments.maxBytes`. */
export const TALK_PICTURE_MAX_BYTES = 1024 * 1024;

/** What he asks when he sends pictures and no words. */
export const PICTURE_ONLY_QUESTION = 'Read the picture and tell me about it.';

export const TOO_MANY_LINE = 'Four pictures at most. The rest were left out.';
export const NOT_A_PICTURE_LINE = 'Only JPEG, PNG or WebP pictures can be sent.';
export const COULD_NOT_USE_LINE = 'That picture could not be used.';

/** A picture ready to send, or kept: its bytes (always JPEG after the cut) and the name it goes under. */
export interface OutgoingPicture {
  bytes: Uint8Array;
  mime: string;
  name: string;
}

/** Whether a file may be sent as a picture: its type is one of the grind's. */
export const isTalkPicture = (file: { type: string }): boolean => TALK_PICTURE_MIMES.includes(file.type);

/** The picture as the phone sends it: a JPEG of at most TALK_MAX_EDGE on the long edge and under TALK_PICTURE_MAX_BYTES. */
export async function preparePicture(file: Blob, place: number): Promise<OutgoingPicture> {
  const shrunk = await shrinkImage(file, { maxEdge: TALK_MAX_EDGE, maxBytes: TALK_PICTURE_MAX_BYTES });
  return { bytes: new Uint8Array(await shrunk.arrayBuffer()), mime: 'image/jpeg', name: `picture-${place + 1}.jpg` };
}

/** The pictures as the grist's files. */
export const filesOf = (pictures: OutgoingPicture[]): grist.GristFile[] => pictures.map(({ bytes, mime, name }) => ({ bytes, mime, name }));

/** The pictures on a paste (a copied screenshot, a copied image): the clipboard's files, else its file items. Empty for text. */
export function pastedPictures(event: ClipboardEvent): File[] {
  const data = event.clipboardData;
  if (!data) return [];
  const files = Array.from(data.files ?? []);
  if (files.length > 0) return files;
  return Array.from(data.items ?? []).flatMap((item) => (item.kind === 'file' ? [item.getAsFile()].filter((f): f is File => f !== null) : []));
}

/** The picture as a data URL to draw it by. A data URL has no life to manage (an object URL must be revoked, and a StrictMode remount revokes one still in use). */
export function dataUrlOf(bytes: Uint8Array, mime: string): string {
  let binary = '';
  for (let at = 0; at < bytes.length; at += 0x8000) binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
  return `data:${mime};base64,${btoa(binary)}`;
}
