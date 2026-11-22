// src/talk/useWaitingPictureViewer.tsx — a picture waiting in a voice-kit Composer opens full size on a tap (mw-51gepef), in the same shared viewer as a sent picture.
import { useCallback, useState, type ReactNode } from 'react';
import type { WaitingFile } from 'voice-kit/composer';
import { Viewer } from './TurnPictures';

/**
 * The viewer for a picture waiting in a voice-kit Composer (mw-51gepef): the one hook every Lampas Composer wires, so no screen draws a waiting picture that
 * cannot be opened. Pass `onFileTap` to the Composer and draw `viewer` beside it. Closing leaves the picture waiting and the words kept; the x on the
 * thumbnail is the Composer's own button and never reaches this.
 */
export function useWaitingPictureViewer(): { onFileTap: (file: WaitingFile) => void; viewer: ReactNode } {
  const [shown, setShown] = useState<{ name: string; url: string } | null>(null);
  const onFileTap = useCallback((file: WaitingFile) => {
    if (file.type.startsWith('image/') && file.preview) setShown({ name: file.name, url: file.preview });
  }, []);
  const close = useCallback(() => setShown(null), []);
  return { onFileTap, viewer: shown ? <Viewer name={shown.name} url={shown.url} onClose={close} /> : null };
}
