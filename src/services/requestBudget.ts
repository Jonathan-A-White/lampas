// The most a request to the tutor may weigh (shared by the Bible talk, src/services/talk.ts, and the Verse view's ask, src/services/tutor.ts).

/** The most a request may weigh, as JSON in UTF-8: the record's payload is capped (bsv-kit's grist MAX_PAYLOAD_BYTES, 20 KiB) and the sealed grist is base64 of this, with the envelope. */
export const MAX_REQUEST_BYTES = 6500;
