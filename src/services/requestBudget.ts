// The most a request to the tutor may weigh (shared by the Bible talk, src/services/talk.ts, and the Verse view's ask, src/services/tutor.ts).

/** The most a request may weigh, as JSON in UTF-8: the record's payload is capped (bsv-kit's grist MAX_PAYLOAD_BYTES, 20 KiB) and the sealed grist is base64 of this, with the envelope (a request at this cap seals to about 11 KiB, tests/unit/request-budget.test.ts).
 * Raised from 6500 (mw-5r3p30.689): the quiz-me request after its first turn weighed 6495, and every setting added makes it bigger; the cap leaves HEADROOM there. */
export const MAX_REQUEST_BYTES = 8000;

/** The longest question he may ask, in the Bible talk and in Ask the tutor alike: room for a prayer or a passage of several paragraphs pasted in. The box
 * keeps whatever he pastes and warns past this (never cuts it); the grinds' input schemas (question) and answer schemas (the cleaned question) say the same. */
export const MAX_QUESTION_CHARS = 4000;
