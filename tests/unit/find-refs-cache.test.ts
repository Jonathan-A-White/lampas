// src/share/findRefs.ts keeps what a picture was read to name by the picture's fingerprint (mw-5r3p30.695, docs/ask-tutor.md 'Share to Lampas'): the same picture
// is never read by the grist twice, whether he comes back to the same share or shares the same picture again, and a reading that failed keeps nothing.
import '@testing-library/react/dont-cleanup-after-each';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { fingerprintOf, KEPT_PICTURES, keepPictureRefs } from '../../src/data/repositories/pictureRefs';
import type { ShareRow } from '../../src/data/repositories/shares';

const ask = vi.hoisted(() => ({ askGrind: vi.fn() }));
vi.mock('../../src/services/tutor', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../src/services/tutor')>()), askGrind: ask.askGrind }));
vi.mock('../../src/services/deviceKey', () => ({ getDeviceKeyBytes: () => new Uint8Array(32) }));
vi.mock('../../src/talk/pictures', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/talk/pictures')>()),
  preparePicture: async (_file: Blob, place: number) => ({ bytes: new Uint8Array([1, 2, 3]), mime: 'image/jpeg', name: `picture-${place + 1}.jpg` }),
}));

const { findRefsInPicture, usePictureRefs } = await import('../../src/share/findRefs');
const { TutorError } = await import('../../src/services/tutor');

afterAll(() => {
  cleanup();
  db.close();
});

const picture = (...bytes: number[]): File => new File([new Uint8Array(bytes)], 'shot.png', { type: 'image/png' });
const ROM = { references: [{ printed: 'Rom 8:28', ref: 'Rom.8.28' }] };

beforeEach(async () => {
  ask.askGrind.mockReset();
  await db.pictureRefs.clear();
});

describe('findRefsInPicture keeps what it read by the picture\'s fingerprint', () => {
  it('reads a picture once: the second time, for the same file or for the same bytes shared anew, the phone answers and the grind is not asked', async () => {
    ask.askGrind.mockResolvedValue(ROM);
    const first = await findRefsInPicture(picture(5, 6, 7), 0);
    expect(first.map((r) => r.ref)).toEqual(['Rom.8.28']);
    expect(ask.askGrind).toHaveBeenCalledTimes(1);

    expect(await findRefsInPicture(picture(5, 6, 7), 0)).toEqual(first);
    const renamed = new File([new Uint8Array([5, 6, 7])], 'another-name.png', { type: 'image/png' });
    expect(await findRefsInPicture(renamed, 2)).toEqual(first);
    expect(ask.askGrind).toHaveBeenCalledTimes(1);
  });

  it('reads a different picture', async () => {
    ask.askGrind.mockResolvedValue(ROM);
    await findRefsInPicture(picture(5, 6, 7), 0);
    ask.askGrind.mockResolvedValue({ references: [{ printed: 'John 3:16', ref: 'John.3.16' }] });
    const other = await findRefsInPicture(picture(5, 6, 8), 0);
    expect(other.map((r) => r.ref)).toEqual(['John.3.16']);
    expect(ask.askGrind).toHaveBeenCalledTimes(2);
  });

  it('keeps a page that names no reference too: that was an answer', async () => {
    ask.askGrind.mockResolvedValue({ references: [] });
    expect(await findRefsInPicture(picture(9), 0)).toEqual([]);
    expect(await findRefsInPicture(picture(9), 0)).toEqual([]);
    expect(ask.askGrind).toHaveBeenCalledTimes(1);
  });

  it('keeps nothing of a reading that failed (offline, not sent, a bad answer), so the next one asks again', async () => {
    for (const failure of [new TutorError('unreachable', 'offline'), new TutorError('not-sent', 'slow'), new TutorError('no-answer', 'bad answer')]) {
      ask.askGrind.mockRejectedValueOnce(failure);
      await expect(findRefsInPicture(picture(4), 0)).rejects.toBe(failure);
      expect(await db.pictureRefs.count()).toBe(0);
    }
    ask.askGrind.mockResolvedValue(ROM);
    expect((await findRefsInPicture(picture(4), 0)).map((r) => r.ref)).toEqual(['Rom.8.28']);
    expect(ask.askGrind).toHaveBeenCalledTimes(4);
  });

  it('still reads when the phone cannot keep or give back a reading', async () => {
    ask.askGrind.mockResolvedValue(ROM);
    const get = vi.spyOn(db.pictureRefs, 'get').mockRejectedValue(new Error('storage refused'));
    const put = vi.spyOn(db.pictureRefs, 'put').mockRejectedValue(new Error('storage refused'));
    expect((await findRefsInPicture(picture(3), 0)).map((r) => r.ref)).toEqual(['Rom.8.28']);
    get.mockRestore();
    put.mockRestore();
  });

  it('keeps the newest pictures only', async () => {
    for (let i = 0; i < KEPT_PICTURES + 3; i++) await keepPictureRefs(`h${i}`, [], i);
    expect(await db.pictureRefs.count()).toBe(KEPT_PICTURES);
    expect(await db.pictureRefs.get('h0')).toBeUndefined();
    expect(await db.pictureRefs.get(`h${KEPT_PICTURES + 2}`)).toBeDefined();
  });

  it('fingerprints the bytes, not the name', async () => {
    expect(await fingerprintOf(picture(1, 2))).toBe(await fingerprintOf(new File([new Uint8Array([1, 2])], 'x.jpg')));
    expect(await fingerprintOf(picture(1, 2))).not.toBe(await fingerprintOf(picture(1, 3)));
    expect(await fingerprintOf(new Blob([]))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

describe('usePictureRefs', () => {
  const row = (id: string): ShareRow => ({ id, createdAt: 1, files: [{ name: 'shot.png', type: 'image/png', bytes: new Uint8Array([7, 7]).buffer }] });

  it('asks once for a share that is opened again, and once more for Try again after a failure only', async () => {
    const [rowA, rowB] = [row('a'), row('b')];
    ask.askGrind.mockRejectedValueOnce(new TutorError('unreachable', 'offline'));
    ask.askGrind.mockResolvedValue(ROM);
    const first = renderHook(() => usePictureRefs(rowA, true));
    await waitFor(() => expect(first.result.current.refs?.status).toBe('failed'));
    first.result.current.retry();
    await waitFor(() => expect(first.result.current.refs?.status).toBe('done'));
    expect(ask.askGrind).toHaveBeenCalledTimes(2);
    first.unmount();

    const again = renderHook(() => usePictureRefs(rowB, true));
    await waitFor(() => expect(again.result.current.refs).toMatchObject({ status: 'done' }));
    expect(ask.askGrind).toHaveBeenCalledTimes(2);
    again.unmount();
  });
});
