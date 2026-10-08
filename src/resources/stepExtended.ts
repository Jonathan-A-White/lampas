// src/resources/stepExtended.ts — where STEPBible's search differs from the bare Strong's number the text carries.
// STEP finds a word by TBESG's extended Strong's number. Where TBESG splits a number by letter, the bare number often finds
// nothing (G2424, Jesus, lists 0 verses; G2424G lists 886). Both tables below come from asking STEP's search once per number
// (the bare number and every TBESG entry of it, the one with the most verses wins); `npm run check:step` repeats the ask for the
// links as they stand. Keys are padded to four digits, as STEP writes them.

/** Base number -> the letter that makes STEP list verses ('G2424' -> 'G', so 'G2424G'). Absent: the bare number works. */
export const STEP_LETTER: Readonly<Record<string, string>> = {
  G0001: 'G', G0007: 'G', G0032: 'G', G0040: 'G', G0068: 'G', G0129: 'G', G0165: 'H', G0223: 'J', G0301: 'G',
  G0367: 'H', G0435: 'G', G0490: 'G', G0630: 'G', G0769: 'G', G0770: 'H', G0772: 'G', G0863: 'G', G0906: 'G',
  G0921: 'G', G0923: 'G', G0928: 'G', G0938: 'H', G1050: 'I', G1056: 'G', G1081: 'G', G1085: 'G', G1093: 'G',
  G1135: 'G', G1487: 'G', G1492: 'H', G1662: 'G', G2060: 'G', G2197: 'H', G2199: 'G', G2216: 'H', G2264: 'H',
  G2266: 'G', G2269: 'G', G2384: 'H', G2385: 'G', G2424: 'G', G2455: 'H', G2459: 'G', G2491: 'G', G2495: 'H',
  G2500: 'G', G2501: 'G', G2533: 'G', G2536: 'G', G2541: 'J', G2542: 'H', G2556: 'G', G2564: 'G', G2570: 'G',
  G2577: 'G', G2763: 'H', G2787: 'G', G2804: 'G', G2839: 'G', G2857: 'G', G2962: 'G', G2976: 'H', G3004: 'G',
  G3017: 'I', G3123: 'G', G3128: 'G', G3137: 'G', G3158: 'G', G3161: 'G', G3197: 'G', G3558: 'G', G3614: 'G',
  G3624: 'G', G3708: 'G', G3754: 'G', G3972: 'G', G3985: 'H', G3986: 'H', G4074: 'G', G4102: 'G', G4151: 'G',
  G4160: 'G', G4245: 'G', G4413: 'G', G4504: 'G', G4527: 'H', G4528: 'G', G4549: 'G', G4569: 'G', G4613: 'O',
  G4672: 'G', G4690: 'G', G4826: 'G', G5083: 'G', G5085: 'G', G5259: 'G', G5328: 'G', G5376: 'G', G5438: 'G',
  G5442: 'I', G5456: 'G', G5514: 'G', G5564: 'G', G5586: 'G', G5590: 'G',
};

/** The numbers STEP lists no verses for under any letter (its tagged text lacks the word); these link to an entry elsewhere. */
export const STEP_NO_VERSES: ReadonlySet<string> = new Set([
  'G0090', 'G0183', 'G0251', 'G0445', 'G0568', 'G0637', 'G0680', 'G0756', 'G0821', 'G0856', 'G1086', 'G1177',
  'G1207', 'G1221', 'G1228', 'G1444', 'G1489', 'G1490', 'G1916', 'G2131', 'G2229', 'G2313', 'G2355', 'G2566',
  'G2640', 'G2651', 'G2735', 'G2781', 'G2796', 'G2909', 'G3002', 'G3018', 'G3166', 'G3181', 'G3193', 'G3459',
  'G3535', 'G3553', 'G4113', 'G4386', 'G4495', 'G4510', 'G4513', 'G4566', 'G4759', 'G4839', 'G4877', 'G5155',
  'G5175', 'G5230', 'G6029', 'G6856', 'G6897',
]);
