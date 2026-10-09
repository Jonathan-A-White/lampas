// src/audio/clip.ts — the clip he recorded, kept with the reading's result so he can hear himself again ('Play my reading') and, in
// Developer mode, save it ('Download my recording'). It is kept as bytes and a mime (a Blob does not survive every store the tests
// use); blobOf makes the Blob again. The save goes through downloadSeam so a test can see the file without a browser.
import { extensionOf, type Recording } from './recorder';

/** A recording as kept in the readings table. */
export interface Clip {
  bytes: ArrayBuffer;
  /** the clip's mime without its codec: audio/webm, audio/ogg or audio/mp4 */
  mime: string;
}

function bytesOfBlob(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

/** The recording as it is kept. */
export async function clipOf(recording: Recording): Promise<Clip> {
  return { bytes: await bytesOfBlob(recording.blob), mime: recording.mime };
}

export const blobOf = (clip: Clip): Blob => new Blob([clip.bytes], { type: clip.mime });

const two = (n: number): string => String(n).padStart(2, '0');

/** 'lampas-rom.8.28-20261009T120000Z.webm': the verse, the language when it is not English, the UTC time it was read, the clip's own type. */
export function clipFileName(ref: string, lang: string, when: number, mime: string): string {
  const d = new Date(when);
  const time = `${d.getUTCFullYear()}${two(d.getUTCMonth() + 1)}${two(d.getUTCDate())}T${two(d.getUTCHours())}${two(d.getUTCMinutes())}${two(d.getUTCSeconds())}Z`;
  return `lampas-${ref}${lang === 'en' ? '' : `-${lang}`}-${time}.${extensionOf(mime)}`;
}

/** How a file is handed to the phone; the real one clicks a link with the download attribute. A test replaces `save`. */
export const downloadSeam: { save: (name: string, blob: Blob) => void } = {
  save: (name, blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // the download has started by the time the click returns; give the browser a moment before the URL goes
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  },
};
