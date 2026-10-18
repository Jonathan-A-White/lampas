// src/PlaceLine.tsx — the one quiet line at the foot of the Reader's text (mw-5r3p30.298): the book and chapter and where he is in it, like a Kindle's
// "Page 9 of 187 · 12%". While the Immersive reader has its bars away it says how far through the chapter's text he has scrolled ('Mark 12 · 45%'); with
// Turn pages (Settings > Reading, mw-5r3p30.299) it is always there, right under the text, and says the page ('Mark 12 · Page 2 of 7'). It is a row
// of its own under the text's box, so it covers no text; small and dim. The CSS is `.place-line` in src/index.css.
export function PlaceLine({ title, at }: { title: string; at: string }) {
  return (
    <p data-place-line className="place-line">
      {title} · {at}
    </p>
  );
}
