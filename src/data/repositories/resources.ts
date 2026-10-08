// src/data/repositories/resources.ts — which study resources he switched on (src/resources/) and the name he typed for a resource's
// field, in the settings store: 'resource.<id>' is 'on', 'resourceOption.<id>' the text. All off, all empty to start with.
import { db } from '../db';

export interface StudyResources {
  /** ids of the resources switched on (in the store's key order) */
  on: string[];
  /** the text he typed for each resource that has a field and has one kept */
  options: Record<string, string>;
}

const ON = 'resource.';
const OPTION = 'resourceOption.';

export async function getStudyResources(): Promise<StudyResources> {
  const rows = await db.settings.toArray();
  const on = rows.filter((r) => r.key.startsWith(ON) && r.value === 'on').map((r) => r.key.slice(ON.length));
  const options: Record<string, string> = {};
  for (const r of rows) if (r.key.startsWith(OPTION) && typeof r.value === 'string' && r.value !== '') options[r.key.slice(OPTION.length)] = r.value;
  return { on, options };
}

export async function setResourceOn(id: string, on: boolean): Promise<void> {
  await db.settings.put({ key: ON + id, value: on ? 'on' : 'off' });
}

export async function setResourceOption(id: string, value: string): Promise<void> {
  await db.settings.put({ key: OPTION + id, value });
}
