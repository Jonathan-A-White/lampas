// src/images/shrink.ts — a picture cut down on the phone before it is sent (the Ask for another approach sheet): about 1280 px on
// the long edge and a JPEG under 300 KB, drawn on a canvas. PROVISIONAL numbers, the constants below. The canvas work is behind
// imageSeam so a test, in jsdom with no canvas, replaces it.

/** The long edge a shrunk picture has at most (px). */
export const MAX_EDGE = 1280;
/** A shrunk picture is JPEG and, when it can be, under this many bytes. */
export const MAX_SHRUNK_BYTES = 300 * 1024;

/** What a shrunk picture must fit: the long edge in px and the bytes. */
export interface ShrinkLimits {
  maxEdge: number;
  maxBytes: number;
}

/** The JPEG qualities tried at each size, best first, and the size is cut to this part of itself when none is small enough. */
const QUALITIES = [0.85, 0.7, 0.55, 0.4];
const SHRINK_STEP = 0.8;
const MAX_ROUNDS = 4;

/** A picture the canvas can draw: its size and whatever the encoder needs to draw it. */
export interface Decoded {
  width: number;
  height: number;
  source: ImageBitmap | HTMLImageElement | null;
}

export const imageSeam = {
  /** Reads the file's pixels. */
  async decode(file: Blob): Promise<Decoded> {
    const source = await createImageBitmap(file);
    return { width: source.width, height: source.height, source };
  },
  /** Draws the picture at `width` x `height` on a canvas and encodes it as a JPEG of `quality` (0 to 1). */
  async encode(decoded: Decoded, width: number, height: number, quality: number): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context || !decoded.source) throw new Error('This phone cannot shrink the picture.');
    // JPEG has no transparency: a screenshot with some would turn black.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(decoded.source, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) throw new Error('This phone cannot shrink the picture.');
    return blob;
  },
};

/** `width` x `height` with the long edge cut to `max`, the shape kept; a picture already smaller is left as it is. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** The picture as a JPEG of at most `maxEdge` (MAX_EDGE) on the long edge: the quality is lowered, then the size, until it is under
 * `maxBytes` (MAX_SHRUNK_BYTES); when it never is, the smallest try is returned. */
export async function shrinkImage(file: Blob, { maxEdge, maxBytes }: ShrinkLimits = { maxEdge: MAX_EDGE, maxBytes: MAX_SHRUNK_BYTES }): Promise<Blob> {
  const decoded = await imageSeam.decode(file);
  let size = fitWithin(decoded.width, decoded.height, maxEdge);
  let smallest: Blob | null = null;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    for (const quality of QUALITIES) {
      const blob = await imageSeam.encode(decoded, size.width, size.height, quality);
      if (blob.size <= maxBytes) return blob;
      if (!smallest || blob.size < smallest.size) smallest = blob;
    }
    size = fitWithin(size.width, size.height, Math.round(Math.max(size.width, size.height) * SHRINK_STEP));
  }
  return smallest as Blob;
}
