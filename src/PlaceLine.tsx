// src/PlaceLine.tsx — the one quiet line at the foot of the Reader while the Immersive reader has its bars away (mw-5r3p30.298): the book and
// chapter and how far through the chapter's text he has scrolled, like a Kindle's "Page 9 of 187 · 12%". It is a row of its own under the text's
// box, so it covers no text; small and dim, and the only thing on screen besides the text. The CSS is `.place-line` in src/index.css.
export function PlaceLine({ title, percent }: { title: string; percent: number }) {
  return (
    <p data-place-line className="place-line">
      {title} · {percent}%
    </p>
  );
}
