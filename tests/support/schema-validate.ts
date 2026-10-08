// tests/support/schema-validate.ts — a small validator for the JSON Schema keywords the grinds' answer schemas use.

export interface Schema {
  type?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: Schema;
  maxItems?: number;
  minItems?: number;
  enum?: unknown[];
  minLength?: number;
  maxLength?: number;
}
const KEYWORDS = new Set(['$schema', 'title', 'description', 'type', 'properties', 'required', 'additionalProperties', 'items', 'maxItems', 'minItems', 'enum', 'minLength', 'maxLength']);

export function validate(value: unknown, s: Schema, path = '$'): string[] {
  for (const k of Object.keys(s)) if (!KEYWORDS.has(k)) throw new Error(`validator does not know ${k}`);
  const kind = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
  if (s.type && s.type !== kind) return [`${path}: expected ${s.type}, got ${kind}`];
  const problems: string[] = [];
  if (s.enum && !s.enum.includes(value)) problems.push(`${path}: not one of ${s.enum.join(', ')}`);
  if (typeof value === 'string') {
    if (s.minLength !== undefined && value.length < s.minLength) problems.push(`${path}: too short`);
    if (s.maxLength !== undefined && value.length > s.maxLength) problems.push(`${path}: too long`);
  }
  if (Array.isArray(value)) {
    if (s.minItems !== undefined && value.length < s.minItems) problems.push(`${path}: too few items`);
    if (s.maxItems !== undefined && value.length > s.maxItems) problems.push(`${path}: too many items`);
    if (s.items) value.forEach((item, i) => problems.push(...validate(item, s.items as Schema, `${path}[${i}]`)));
  }
  if (kind === 'object') {
    const object = value as Record<string, unknown>;
    for (const name of s.required ?? []) if (!(name in object)) problems.push(`${path}.${name}: missing`);
    for (const [name, v] of Object.entries(object)) {
      const sub = s.properties?.[name];
      if (sub) problems.push(...validate(v, sub, `${path}.${name}`));
      else if (s.additionalProperties === false) problems.push(`${path}.${name}: not allowed`);
    }
  }
  return problems;
}
