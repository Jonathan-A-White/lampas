// src/tutor/fit.ts — the cuts that make the tutor client's part of a request give way (mw-t3xu9a.4), each a voice-kit `Cut<TalkRequest>` run before the Bible talk's own
// (src/services/talkFit.ts): the client adds `facts` and `catalogue` to a request that already fits a grist, and what they weigh must not cost him his talk. The tell lines of the
// catalogue go first (a name alone still lets the tutor call it), then a fact that only repeats a field the request carries as it is (the settings, today's drill) until the grind
// reads facts instead of those fields, then the catalogue and the facts that are left. The Bible talk's request is held to a grist's cap that a long passage fills, and this story changes
// no behaviour (mw-t3xu9a.4): the text and the turns he has are what the cap is kept for, so the client's part is all that goes before any of them is cut. The cap is raised, or the old
// fields give way to the facts, in mw-t3xu9a.5.
import type { Cut } from 'voice-kit/talks';
import type { TalkRequest } from '../services/talk';

/** The last tell line of the catalogue cut away, one per call; null when none is left. */
export const dropCatalogueTell: Cut<TalkRequest> = (request) => {
  const catalogue = request.catalogue;
  if (!catalogue) return null;
  const at = catalogue.findLastIndex((entry) => entry.tell !== undefined);
  if (at < 0) return null;
  const rest = { ...catalogue[at] };
  delete rest.tell;
  return { ...request, catalogue: catalogue.map((entry, i) => (i === at ? rest : entry)) };
};

/** The facts that say again what a field of the request already says: fact name -> that field. */
const REPEATS: Readonly<Record<string, keyof TalkRequest>> = { settings: 'settings', 'today-drill': 'today' };

/** One fact that repeats a field of the request dropped; null when none does. */
export const dropRepeatedFact: Cut<TalkRequest> = (request) => {
  const facts = request.facts;
  const name = facts && Object.keys(facts).find((key) => key in REPEATS && request[REPEATS[key]] !== undefined);
  if (!facts || name === undefined) return null;
  const rest = { ...facts };
  delete rest[name];
  return { ...request, facts: rest };
};

/** The catalogue, names and all; null when the request has none. */
export const dropCatalogue: Cut<TalkRequest> = (request) => {
  if (request.catalogue === undefined) return null;
  const rest = { ...request };
  delete rest.catalogue;
  return rest;
};

/** The facts that are left, one per call (the last read first); null when none is left. */
export const dropLastFact: Cut<TalkRequest> = (request) => {
  const names = request.facts ? Object.keys(request.facts) : [];
  if (!request.facts || names.length === 0) return null;
  const rest = { ...request };
  if (names.length === 1) delete rest.facts;
  else rest.facts = Object.fromEntries(Object.entries(request.facts).slice(0, -1));
  return rest;
};

/** The cuts, in the order they are taken. */
export const tutorFitSteps: readonly Cut<TalkRequest>[] = [dropCatalogueTell, dropRepeatedFact, dropCatalogue, dropLastFact];
