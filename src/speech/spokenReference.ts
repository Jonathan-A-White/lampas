// src/speech/spokenReference.ts — the one place a written reference or number range becomes words to say (mw-fnvjof.17.199): the phone's voice reads the hyphen of
// 'Acts 2:29-36' as 'minus', so every text handed to the phone's voice (speakText, src/speech/greek.ts) and each reference heading the passage player says goes through here.
// 'Acts 2:29-36' is 'Acts 2, verses 29 through 36'; 'Genesis 1:1-2:3' is 'Genesis, chapter 1 verse 1 through chapter 2 verse 3'; 'John 10:27' is 'John 10, verse 27';
// 'pages 3-5' is 'pages 3 through 5'. A hyphen, an en dash and an em dash are the same. A chapter:verse is taken for a reference only after a capitalised word (a book),
// so a time ('at 10:30') is left alone. Running it on its own output changes nothing.

const DASH = '[-\\u2010-\\u2015]';
// a book's last word (capitalised, or an abbreviation with a stop), then the space; a chapter:verse, and a range to a verse of the chapter or to chapter:verse
const BOOKED = new RegExp(`(\\p{Lu}[\\p{L}.]*)\\s+(\\d+):(\\d+)(?:\\s*${DASH}\\s*(\\d+)(?::(\\d+))?)?(?![\\d:])`, 'gu');
const RANGE = new RegExp(`(?<![\\d:.${DASH.slice(1, -1)}])(\\d+)\\s*${DASH}\\s*(\\d+)(?![\\d:]|${DASH}\\d)`, 'gu');

/** `text` with each reference and number range written out as words, for the voice. */
export function spokenReference(text: string): string {
  return text
    .replace(BOOKED, (_m, book: string, chapter: string, verse: string, to?: string, toVerse?: string) => {
      if (to === undefined) return `${book} ${chapter}, verse ${verse}`;
      if (toVerse !== undefined) return `${book}, chapter ${chapter} verse ${verse} through chapter ${to} verse ${toVerse}`;
      return `${book} ${chapter}, verses ${verse} through ${to}`;
    })
    .replace(RANGE, '$1 through $2');
}

/** `text` as the voice is handed it: references written out as words, unless it is said in Greek or Hebrew (their letters hold no reference). */
export function spokenText(text: string, language?: 'english' | 'greek' | 'hebrew'): string {
  if (language === 'greek' || language === 'hebrew') return text;
  return /[Ͱ-Ͽἀ-῿֐-׿]/u.test(text) ? text : spokenReference(text);
}
