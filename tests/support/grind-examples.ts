// tests/support/grind-examples.ts — support for the grind scenarios under grinds/examples/<kind>/<name>.json
// (format: grinds/examples/README.md). Test-side only: the app never imports it. `mw grist smoke` sends each
// scenario's request through the live grist and runs the same checks (checkExpect) on the answer.
import { validate, type Schema } from './schema-validate';

/** An example photo or recording has to stay public-safe and small. */
export const EXAMPLE_FILE_MAX_BYTES = 200 * 1024;

/** What one answer field must show. Every key given must hold. */
export interface FieldCheck {
  equals?: unknown;
  is_null?: boolean;
  one_of?: unknown[];
  contains?: string;
  matches?: string;
  present?: boolean;
}

/** Answer path (a field name, dots for nested fields and array places) to what it must show. */
export type ExpectBlock = Record<string, FieldCheck>;

export interface GrindExample {
  description: string;
  schemaVersion: string;
  request: Record<string, unknown>;
  /** File names beside the scenario: the photos, or for a grind that takes a recording, the recording. */
  photos?: string[];
  expect: ExpectBlock;
}

/** The check names `mw grist smoke` knows (millwright application/gristsmokecheck.go): snake_case, nothing else. */
export const CHECKS = ['equals', 'is_null', 'one_of', 'contains', 'matches', 'present'];

/** The camelCase spelling of each check name, which the smoke does not know: a bare string of one is a mistake, not a value. */
const CAMEL_CHECKS: Record<string, string> = { isNull: '{ "is_null": true }', oneOf: '{ "one_of": [...] }' };

/** The mill's answer to a forwarding grind (no answer schema of its own). */
export const FORWARD_ANSWER_SCHEMA: Schema = { type: 'object', properties: { status: { type: 'string', enum: ['sent'] } }, required: ['status'], additionalProperties: false };

/**
 * True when a JavaScript pattern uses what the mill's Go regexp (RE2) cannot compile: lookarounds (?= (?! (?<= (?<!, a backreference
 * (\1 to \9) and the empty negated class [^] (write [\s\S] for "any character"). Escapes and the inside of a class are skipped.
 */
export function usesBeyondRe2(pattern: string): boolean {
  let inClass = false;
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '\\') {
      if (!inClass && /[1-9]/.test(pattern[i + 1] ?? '')) return true;
      i++;
    } else if (inClass) {
      if (ch === ']') inClass = false;
    } else if (ch === '[') {
      if (pattern.startsWith('[^]', i)) return true;
      inClass = true;
      if (pattern[i + 1] === '^') i++;
    } else if (ch === '(' && /^\(\?(=|!|<=|<!)/.test(pattern.slice(i, i + 4))) {
      return true;
    }
  }
  return false;
}

/** The schemas a path can stand at: a field name, or an array place (a number) into `items`; anyOf branches are all tried. */
function schemasAt(root: Schema, path: string): Schema[] {
  let nodes: Schema[] = [root];
  for (const part of path.split('.')) {
    const next: Schema[] = [];
    for (const node of nodes.flatMap(branches)) {
      const sub = /^\d+$/.test(part) && node.type === 'array' ? node.items : node.properties?.[part];
      if (sub) next.push(sub);
    }
    if (next.length === 0) return [];
    nodes = next;
  }
  return nodes.flatMap(branches);
}

const branches = (schema: Schema): Schema[] => (schema.anyOf ? schema.anyOf.flatMap(branches) : [schema]);

/** What is wrong with an expect block against the grind's answer schema; empty when it is sound. */
export function expectProblems(expectBlock: unknown, answerSchema: Schema): string[] {
  if (typeof expectBlock !== 'object' || expectBlock === null || Array.isArray(expectBlock)) return ['expect: must be an object of answer path to checks'];
  const entries = Object.entries(expectBlock as Record<string, unknown>);
  if (entries.length === 0) return ['expect: has no checks'];
  const problems: string[] = [];
  for (const [path, check] of entries) {
    const schemas = schemasAt(answerSchema, path);
    if (schemas.length === 0) {
      problems.push(`${path}: not a field of the answer schema`);
      continue;
    }
    if (typeof check === 'string' && check in CAMEL_CHECKS) {
      problems.push(`${path}: "${check}" looks like a check name; write ${CAMEL_CHECKS[check]}`);
      continue;
    }
    if (typeof check !== 'object' || check === null || Array.isArray(check)) {
      problems.push(`${path}: must be an object of checks`);
      continue;
    }
    const keys = Object.keys(check);
    if (keys.length === 0) problems.push(`${path}: has no checks`);
    for (const key of keys) if (!CHECKS.includes(key)) problems.push(`${path}: unknown check "${key}"`);
    const c = check as FieldCheck;
    const allowed = (value: unknown): boolean => schemas.some((s) => validate(value, s).length === 0);
    if ('equals' in c && !allowed(c.equals)) problems.push(`${path}: equals ${JSON.stringify(c.equals)} is never a valid answer`);
    if ('one_of' in c) {
      if (!Array.isArray(c.one_of) || c.one_of.length === 0) problems.push(`${path}: one_of must be a non-empty list`);
      else for (const value of c.one_of) if (!allowed(value)) problems.push(`${path}: one_of ${JSON.stringify(value)} is never a valid answer`);
    }
    if ('is_null' in c) {
      if (typeof c.is_null !== 'boolean') problems.push(`${path}: is_null must be true or false`);
      else if (c.is_null && !allowed(null)) problems.push(`${path}: is never null in the answer schema`);
    }
    if ('present' in c && typeof c.present !== 'boolean') problems.push(`${path}: present must be true or false`);
    for (const key of ['contains', 'matches'] as const) {
      if (!(key in c)) continue;
      if (typeof c[key] !== 'string') problems.push(`${path}: ${key} must be a string`);
      else if (!schemas.some((s) => s.type === 'string')) problems.push(`${path}: ${key} needs a string field`);
    }
    if (typeof c.matches === 'string') {
      try {
        new RegExp(c.matches);
      } catch {
        problems.push(`${path}: matches is not a valid pattern`);
      }
      if (usesBeyondRe2(c.matches)) problems.push(`${path}: matches uses syntax RE2 (the mill's Go regexp) cannot compile`);
    }
  }
  return problems;
}

function valueAt(answer: unknown, path: string): unknown {
  let node = answer;
  for (const part of path.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

/** What an answer fails to show of an expect block; empty when every check holds. */
export function checkExpect(expectBlock: ExpectBlock, answer: unknown): string[] {
  const failures: string[] = [];
  for (const [path, c] of Object.entries(expectBlock)) {
    const value = valueAt(answer, path);
    const shown = JSON.stringify(value) ?? 'absent';
    if ('equals' in c && JSON.stringify(value) !== JSON.stringify(c.equals)) failures.push(`${path}: expected ${JSON.stringify(c.equals)}, got ${shown}`);
    if (c.is_null !== undefined && (value === null) !== c.is_null) failures.push(`${path}: expected ${c.is_null ? 'null' : 'not null'}, got ${shown}`);
    if (c.one_of && !c.one_of.some((o) => JSON.stringify(o) === JSON.stringify(value))) failures.push(`${path}: expected one of ${JSON.stringify(c.one_of)}, got ${shown}`);
    if (c.contains !== undefined && !(typeof value === 'string' && value.includes(c.contains))) failures.push(`${path}: expected to contain ${JSON.stringify(c.contains)}, got ${shown}`);
    if (c.matches !== undefined && !(typeof value === 'string' && new RegExp(c.matches).test(value))) failures.push(`${path}: expected to match /${c.matches}/, got ${shown}`);
    if (c.present !== undefined && (value !== undefined) !== c.present) failures.push(`${path}: expected ${c.present ? 'present' : 'absent'}, got ${shown}`);
  }
  return failures;
}
