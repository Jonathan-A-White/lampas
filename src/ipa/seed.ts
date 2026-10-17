// src/ipa/seed.ts — the seed the course 'Learn the IPA sounds' draws its rounds and its pass check from: random in the app; a feature step fixes it, then rebuilds each
// question with the same pure functions to know which choice is right (as letterDrillSeed does for the letter drill).
export const ipaSeed = { next: (): number => Math.floor(Math.random() * 2 ** 31) };
