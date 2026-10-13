// src/data/learnerProfile.ts — what every tutor grist is told of the student as a person (mw-1vuvq6.1): the request's `learner_profile`, made from the
// profile kept on the phone (repositories/profile.ts, Settings > About you). Only the fields he filled in go; with none filled the field is missing
// (the grinds' input schemas do not require it). It is bounded by the schemas: short fields, at most PROFILE_NOTES_SENT notes of the newest, as plain text.
// Beside his own fields go what the tutor learned in talks (`learned`, a guess marked; mw-1vuvq6.3), what the phone sees of his pace and ways
// (`observed_pace`, `observed_ways`, src/data/observedProfile.ts) and the fields the tutor must not ask about now (`do_not_ask`).
import { observedNow } from './observedProfile';
import { PROFILE_NOTES_SENT, doNotAsk, getProfile, isSuggestion, type Learnable, type Pace, type Profile, type Way } from './repositories/profile';

/** What the tutor learned in a talk, as sent; `guessed` only when it is only a guess. */
export interface LearnedField {
  field: Learnable;
  value: string;
  guessed?: true;
}

/** The `learner_profile` field of a request (grinds/*.input.schema.json). */
export interface LearnerProfile {
  age?: string;
  pace?: Pace;
  ways?: Way[];
  background?: string;
  why?: string;
  notes?: string[];
  learned?: LearnedField[];
  /** how he seems to go, from the timing and accuracy of his answers */
  observed_pace?: Pace;
  /** the share of each way in what he uses, whole percent */
  observed_ways?: Partial<Record<Way, number>>;
  do_not_ask?: Learnable[];
}

/** The phone's own sight of him, as `observedNow` returns it. */
export interface Observed {
  pace?: Pace;
  ways?: Partial<Record<Way, number>>;
}

/** The field for `profile`, or undefined when nothing is filled in. */
export function learnerProfileOf(profile: Profile, observed: Observed = {}, now: number = Date.now()): LearnerProfile | undefined {
  const field: LearnerProfile = {};
  if (profile.age) field.age = profile.age;
  if (profile.pace) field.pace = profile.pace;
  if (profile.ways.length > 0) field.ways = [...profile.ways];
  if (profile.background) field.background = profile.background;
  if (profile.why) field.why = profile.why;
  if (profile.notes.length > 0) field.notes = profile.notes.slice(-PROFILE_NOTES_SENT).map((n) => n.text);
  const learned = (profile.learned ?? []).filter((l) => !isSuggestion(profile, l));
  if (learned.length > 0) field.learned = learned.map((l) => ({ field: l.field, value: l.value, ...(l.guessed ? { guessed: true as const } : {}) }));
  if (observed.pace) field.observed_pace = observed.pace;
  if (observed.ways && Object.keys(observed.ways).length > 0) field.observed_ways = observed.ways;
  const asked = doNotAsk(profile, now);
  if (asked.length > 0) field.do_not_ask = asked;
  return Object.keys(field).length > 0 ? field : undefined;
}

/** The field for what is kept now and what the phone sees. */
export async function learnerProfile(now: number = Date.now()): Promise<LearnerProfile | undefined> {
  const [profile, observed] = await Promise.all([getProfile(), observedNow(now).catch((): Observed => ({}))]);
  return learnerProfileOf(profile, observed, now);
}
