// src/diagram/weave.ts — an English diagram as the Weave shows the verse (mw-souyao.5): the tree is the one the tutor drew for the English, and only the words it is drawn with change, so
// switching the Weave is no new ask. A chunk the Weave shows in Greek is drawn as its Greek words, in the place of the English words it was split into: the chunk's first words take the
// Greek words one each (the last of them all that are left, when the Greek is the longer), and the words of the chunk that are left over are drawn as nothing (text '', no button). A chunk the Weave keeps
// in English but shows a known Greek word before ('δὲ So', Mark 12:16; WovenVerse.beside) keeps its English words and the first of them is drawn with that Greek word before it, `beside` naming the Greek (mw-5r3p30.1141). A known Greek word of the
// Septuagint that no chunk holds (WovenVerse.unheld) has no English words to stand in: it is drawn with the first word of the chunk it stands before (mw-u2w5klk.349.124). Pure.
import type { Verse } from '../data/chapter';
import { drawnPieces, type WovenVerse } from '../data/weave';
import type { DiagramWords } from './types';

/** `words` (English, from buildDiagramRequest) with the words of every woven chunk of `verses` replaced; `wovenOf` is a verse's weave (null: none of it is shown in Greek). The same list when nothing is woven. */
export function weaveDiagramWords(words: DiagramWords, verses: readonly Verse[], wovenOf: (verse: Verse) => WovenVerse | null): DiagramWords {
  const mine = new Map<number, WovenVerse | null>(verses.map((v) => [v.n, wovenOf(v)]));
  const byChunk = new Map<string, number[]>();
  words.forEach((word, i) => {
    if (!('chunk' in word)) return;
    const key = `${word.verse ?? verses[0].n}:${word.chunk}`;
    byChunk.set(key, [...(byChunk.get(key) ?? []), i]);
  });
  let changed = false;
  const shown = words.map((word) => word);
  for (const [key, places] of byChunk) {
    const [n, chunk] = key.split(':').map(Number);
    const verse = verses.find((v) => v.n === n);
    const weft = mine.get(n)?.[chunk];
    const beside = mine.get(n)?.beside?.[chunk];
    if (verse && !weft && beside?.length) {
      const first = places[0];
      const greek = beside.map((w) => verse.g.indexOf(w));
      shown[first] = { ...words[first], text: [...beside.map((w) => w.t), words[first].text].join(' '), beside: greek };
      changed = true;
      continue;
    }
    if (!verse || !weft || weft.words.length === 0) continue;
    const greek = verse.e[chunk].g;
    places.forEach((place, k) => {
      const taken = k < weft.words.length ? (k === places.length - 1 ? greek.slice(k) : [greek[k]]) : [];
      shown[place] = { ...words[place], text: taken.map((g) => verse.g[g].t).join(' '), weft: taken };
      changed = true;
    });
  }
  for (const verse of verses) {
    const weave = mine.get(verse.n);
    if (!weave?.unheld?.size) continue;
    // the words waiting for a place: they are drawn before the first word of the next chunk that has words in this diagram, or at the verse's end with the last word before them
    let waiting: number[] = [];
    let last: number | undefined;
    // an English word's known Greek stands before it (`beside`, as ReedKellogg draws it); a Greek one takes it on either side
    const put = (place: number, after = false): void => {
      if (waiting.length === 0) return;
      const word = shown[place];
      const greek = waiting.map((g) => verse.g[g].t);
      const behind = after && 'weft' in word && word.weft !== undefined;
      const text = (behind ? [word.text, ...greek] : [...greek, word.text]).filter(Boolean).join(' ');
      if ('weft' in word && word.weft) shown[place] = { ...word, text, weft: behind ? [...word.weft, ...waiting] : [...waiting, ...word.weft] };
      else shown[place] = { ...word, text, beside: [...waiting, ...(('beside' in word && word.beside) || [])] };
      waiting = [];
      changed = true;
    };
    for (const piece of drawnPieces(verse, weave)) {
      if ('word' in piece) {
        waiting.push(piece.word);
        continue;
      }
      const places = byChunk.get(`${verse.n}:${piece.chunk}`);
      if (!places) continue;
      put(places[0]);
      // the chunk's last word that is drawn (the Weave may have emptied the ones after it)
      last = [...places].reverse().find((p) => shown[p].text !== '') ?? places[places.length - 1];
    }
    if (last !== undefined) put(last, true);
  }
  return changed ? shown : words;
}
