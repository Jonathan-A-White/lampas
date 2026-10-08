// src/WordPicture.tsx — a word's memory picture (src/data/pictures.ts), or nothing when it has none.
// Decorative: alt is empty, because the Greek and the gloss are always on screen beside it. The picture
// is a tile with its own background, so it reads the same in the light and the dark theme.
import { pictureUrl } from './data/pictures';

export function WordPicture({ lemma, size, testId, className = '' }: { lemma: string; size: number; testId?: string; className?: string }) {
  const src = pictureUrl(lemma);
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      decoding="async"
      draggable={false}
      data-testid={testId}
      className={`shrink-0 rounded-xl ${className}`}
    />
  );
}
