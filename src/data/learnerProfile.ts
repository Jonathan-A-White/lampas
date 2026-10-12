// src/data/learnerProfile.ts — what every tutor grist is told of the student as a person (mw-1vuvq6.1): the request's `learner_profile`, made from the
// profile kept on the phone (repositories/profile.ts, Settings > About you). Only the fields he filled in go; with none filled the field is missing
// (the grinds' input schemas do not require it). It is bounded by the schemas: short fields, at most PROFILE_NOTES_SENT notes of the newest, as plain text.
import { PROFILE_NOTES_SENT, getProfile, type Pace, type Profile, type Way } from './repositories/profile';

/** The `learner_profile` field of a request (grinds/*.input.schema.json). */
export interface LearnerProfile {
  age?: string;
  pace?: Pace;
  ways?: Way[];
  background?: string;
  why?: string;
  notes?: string[];
}

/** The field for `profile`, or undefined when nothing is filled in. */
export function learnerProfileOf(profile: Profile): LearnerProfile | undefined {
  const field: LearnerProfile = {};
  if (profile.age) field.age = profile.age;
  if (profile.pace) field.pace = profile.pace;
  if (profile.ways.length > 0) field.ways = [...profile.ways];
  if (profile.background) field.background = profile.background;
  if (profile.why) field.why = profile.why;
  if (profile.notes.length > 0) field.notes = profile.notes.slice(-PROFILE_NOTES_SENT).map((n) => n.text);
  return Object.keys(field).length > 0 ? field : undefined;
}

/** The field for what is kept now. */
export async function learnerProfile(): Promise<LearnerProfile | undefined> {
  return learnerProfileOf(await getProfile());
}
