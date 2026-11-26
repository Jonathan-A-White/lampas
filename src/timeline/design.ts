// src/timeline/design.ts — the numbers of the timeline strip (mw-fnvjof.17.317.2), each with a row in docs/timeline-design.md 'Motion', 'Layout' or 'Type'. They are the prototype's own
// (prototypes/timeline/timeline.js): tests/unit/timeline-strip.test.ts fails when one here differs from the prototype's, and tests/unit/timeline-design.test.ts when the prototype's differs
// from the doc's table, so the app, the prototype and the page say the same thing.

/** The motion's numbers. */
export const MOTION = {
  /** the time constant of a fling's decay, ms: it comes to rest v x GLIDE_MS further on */
  GLIDE_MS: 325,
  /** the finger's speed is read over its last 100 ms (the page turn's own, src/reader/usePages.ts) */
  SPEED_WINDOW_MS: 100,
  /** px/ms: slower than this, letting go is not a fling */
  FLING_MIN: 0.05,
  /** px/ms: a fling is never faster than this */
  FLING_MAX: 6,
  /** a glide that would rest this near the chapter settles on it, px */
  SNAP_PX: 28,
  /** the share of the finger's travel the strip follows past an end (the chapter swipe's FOLLOW_SHARE) */
  RUBBER: 0.35,
  /** back from past an end, a settle on the chapter, an arrow key's move: the bars' own time (src/Away.tsx) */
  SPRING_MS: 200,
  /** one tap of a zoom button, or one + or - key */
  ZOOM_STEP: 2,
  /** a zoom step's time, ms */
  ZOOM_MS: 240,
  /** a flight (to the chapter, to the whole Bible) takes between these, ms */
  FLY_MIN_MS: 240,
  FLY_MAX_MS: 640,
  /** a finger that moves less is a tap, px (the ladder graph's own) */
  TAP_SLOP: 8,
  /** no pan starts this near a side of the screen: that is the phone's own Back swipe (the chapter swipe's own) */
  EDGE_PX: 24,
  /** an arrow key, Earlier or Later moves by this share of the width (the ladder graph's own) */
  PAN_STEP: 0.4,
  /** a mark changing lane, a label coming or going, ms */
  EASE_MS: 120,
  /** the card rising and leaving, ms (mw-fnvjof.17.317.3) */
  CARD_MS: 200,
} as const;

/** The layout's numbers, in px unless said. */
export const LAYOUT = {
  /** a lane of events or of people: a thumb tall */
  LANE: 44,
  /** the ruler between them: ribbon, line, ticks, years */
  SPINE: 44,
  /** the room at the top for the chapter's name */
  FLAG: 18,
  /** the least strip: the flag, one lane, the ruler */
  STRIP_MIN: 106,
  /** the strip with five lanes: it keeps this height while the dock's body has it */
  STRIP_FULL: 282,
  /** an event's bar in its lane */
  BAR: 28,
  /** an event of a day */
  DOT: 10,
  /** a life's line */
  LIFE: 4,
  /** the least width the packer gives a mark, so two never stand closer than a thumb */
  TARGET: 44,
  /** a title is cut with an ellipsis past this */
  LABEL_MAX: 200,
  /** between two marks of a lane */
  GAP: 8,
  /** the least distance between two years written on the ruler */
  TICK_GAP: 72,
  /** the share of the width the chapter's years take when the strip opens */
  HOME_SHARE: 0.62,
  /** people never take more than this share of the lanes */
  PEOPLE_SHARE: 0.6,
  /** the fade at each side, where time goes on */
  EDGE_FADE: 16,
  /** the room left of the whole Bible, so its first year is written whole */
  WHOLE_PAD: 32,
  /** the room right of it: the two zoom buttons at the ruler's end and a fade, so AD 1 is never under them */
  ZOOM_BOX: 104,
  /** titles and names (text-base) */
  TITLE_PX: 16,
  /** years, the chapter's name (text-sm) */
  SMALL_PX: 14,
  /** the canvas is never drawn at more than two device px to one (src/reader/pageSnapshot.ts MAX_SCALE) */
  DPR_MAX: 2,
  /** the closest zoom: one day this wide */
  DAY_PX: 48,
  /** among the other books' events, those nearest this width at the zoom choose a lane first */
  SUIT_EVENT: 120,
  /** and the same for the lives */
  SUIT_LIFE: 160,
} as const;

/** The picture's type follows Settings > Appearance > Text size up to this, where a 16 px title is still inside its 28 px bar; the lanes stay 44 px, as the app's tap heights do (docs/timeline-design.md 'Type'). */
export const TYPE_SCALE_MAX = 1.3;

/**
 * The strip's height in a dock whose body is `body` px tall, with a credit line `credit` px tall under it (docs/timeline-design.md 'Layout', decision D2): the strip keeps its five lanes
 * while the body has them, grows with a taller body so the credit is in view whole, and is never under its least.
 */
export const stripHeight = (body: number, credit: number): number => Math.max(LAYOUT.STRIP_MIN, Math.min(body, Math.max(LAYOUT.STRIP_FULL, body - credit)));

/** The least room a card is given at the strip's foot: its head, its date and a row of chips (the prototype's own 132 px). */
export const CARD_MIN = 132;

/**
 * The most a card may take of a strip `strip` px tall (docs/timeline-design.md 'The card'): never more than the strip less its least (STRIP_MIN: the chapter's name, one lane and the
 * ruler stay in view above it), longer and it scrolls. A strip too small to leave both that and a card's least gives the card its least, up to the whole strip (the dock pulled to
 * its smallest: the card takes the strip until it is shut or the dock is pulled taller).
 */
export const cardRoom = (strip: number): number => (strip - LAYOUT.STRIP_MIN >= CARD_MIN ? strip - LAYOUT.STRIP_MIN : Math.min(strip, CARD_MIN));
