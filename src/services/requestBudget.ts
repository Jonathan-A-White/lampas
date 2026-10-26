// The most a request to the tutor may weigh (shared by the Bible talk, src/services/talk.ts, and the Verse view's ask, src/services/tutor.ts).

/** The most a request may weigh, as JSON in UTF-8: the record's payload is capped (bsv-kit's grist MAX_PAYLOAD_BYTES, 20 KiB) and the sealed grist is base64 of this, with the envelope (a request at this cap seals to about 12 KiB, tests/unit/request-budget.test.ts).
 * Raised from 6500 (mw-5r3p30.689): the quiz-me request after its first turn weighed 6495, and every setting added makes it bigger; the cap leaves HEADROOM there. Raised from 8000 (mw-rfjjzd.10): the digest of his shelf
 * (WORKS_BYTES) is the one field a request gained at 110 books, and the same request weighed 7918 with it in, 73 from the old cap. Raised from 9000 (mw-9txn0x1.1): When you copy's four settings
 * took the 110-book request to 973 bytes of headroom, 27 under HEADROOM_BYTES (tests/unit/request-budget.test.ts). */
export const MAX_REQUEST_BYTES = 9200;

/** The most the digest of his Logos shelf may weigh in a request (mw-rfjjzd.10, src/resources/tutorLinks.ts worksForTutor): 110 books chosen by the place come to about this, and fitHistory cuts the digest from its end before it cuts the history, after the word list. */
export const WORKS_BYTES = 1200;

/** The longest question he may ask, in the Bible talk and in Ask the tutor alike: room for a prayer or a passage of several paragraphs pasted in. The box
 * keeps whatever he pastes and warns past this (never cuts it); the grinds' input schemas (question) and answer schemas (the cleaned question) say the same. */
export const MAX_QUESTION_CHARS = 4000;

/** The longest running summary of a talk, in characters (mw-5r3p30.700): what the tutor writes of the turns that fell out of the 10-turn window; the answer schema and the request schema say the same. */
export const TALK_SUMMARY_MAX = 1000;

/** At most this many turns that fell out of the window are sent to be folded into the summary in one request (`fold`); a longer backlog (an old talk) is worked off a few at a time. */
export const FOLD_MAX_TURNS = 3;

/** A turn in `fold` is cut to this much of what he said and of what the tutor answered, ending in … where it is cut: the summary keeps the point, not the words. */
export const FOLD_Q_CHARS = 200;
export const FOLD_A_CHARS = 300;

/** The mark a clipped text ends with, so the tutor can see the text goes on past what it was sent. */
export const TEXT_CLIP_MARK = ' …';

/** The text with its last tenth (at least 40 characters) cut at a space, ending in TEXT_CLIP_MARK. A text of 200 characters or fewer is not cut. */
export function clipText(text: string): string {
  if (text.length <= 200) return text;
  const body = text.endsWith(TEXT_CLIP_MARK) ? text.slice(0, -TEXT_CLIP_MARK.length) : text;
  const cut = body.slice(0, body.length - Math.max(40, Math.floor(body.length / 10)));
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 0)).trimEnd() + TEXT_CLIP_MARK;
}

/**
 * Clips the longer of a request's two texts (Greek and English of the same verses) a tenth at a time while `tooBig` says the request is still over its cap
 * (mw-5r3p30.699: a whole chapter opened from the place line is a passage no request holds). The first part of the text is kept, since the tutor reads on from
 * the verse the reference starts at. Returns the texts as they ended up.
 */
export function clipTexts(texts: { greek: string; english: string }, tooBig: (texts: { greek: string; english: string }) => boolean): { greek: string; english: string } {
  let now = texts;
  while (tooBig(now)) {
    const key = now.greek.length >= now.english.length ? 'greek' : 'english';
    const clipped = clipText(now[key]);
    if (clipped === now[key]) break;
    now = { ...now, [key]: clipped };
  }
  return now;
}
