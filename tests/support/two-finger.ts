// tests/support/two-finger.ts — where the two fingers of a two-finger tap land (a thumb and a finger, apart, well inside the 16 px slop of the tap: they do not move). A two-finger tap goes in and out of
// immersive reading and opens nothing else (src/immersive.ts; the floating ? is the tutor's one door, src/tutor/door.ts). features/steps/open-tutor.ts sends them as touch events to the document (jsdom);
// tests/e2e/open-tutor.ts sends them to the browser (Playwright, through CDP).
export const TWO_FINGERS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 150, y: 450 },
  { x: 240, y: 460 },
];
