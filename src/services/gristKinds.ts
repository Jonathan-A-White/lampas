// src/services/gristKinds.ts — every kind of grist Lampas sends to the mill, in one place (mw-umv8sp.4). askGrind (tutor.ts), the one way into the gated client
// (mill.ts), takes only a kind listed here, so a new grind is listed here before it can be sent. Each is a grind of the rig (grinds/<kind>.json), and
// tests/unit/mill-gate.test.ts holds the three together: this list, the grinds, and the kinds the code sends, each with the entry points a phone with no licence is
// not shown. The backend needs nothing per kind: POSTERN_APPS opens the grist door to the app ('lampas'), and the mill reads the grinds from the rig's main.
export const GRIST_KINDS = ['verse-ask', 'bible-talk', 'verse-read', 'tips', 'feedback', 'drill-items', 'find-refs', 'audible-position'] as const;

export type GristKind = (typeof GRIST_KINDS)[number];

/** The kinds that are turns of a talk, which the mill keeps one session for (grist header `talk`, mw-pxji7y.3): the Bible talk. verse-ask is one question and an answer, so it names none. */
export const TALK_KINDS: readonly GristKind[] = ['bible-talk'];
