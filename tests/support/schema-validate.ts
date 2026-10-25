// tests/support/schema-validate.ts — a small validator for the JSON Schema keywords the grinds' answer schemas use.

export interface Schema {
  type?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  additionalProperties?: boolean | Schema;
  items?: Schema;
  maxItems?: number;
  minItems?: number;
  enum?: unknown[];
  minLength?: number;
  maxLength?: number;
  anyOf?: Schema[];
  const?: unknown;
  minimum?: number;
  maximum?: number;
  /** a reference into the schema's own `$defs` ('#/$defs/slot'), which is how a recursive answer (the sentence diagram's tree) is written */
  $ref?: string;
  $defs?: Record<string, Schema>;
}
const KEYWORDS = new Set(['$schema', 'title', 'description', 'type', 'properties', 'required', 'additionalProperties', 'items', 'maxItems', 'minItems', 'minLength', 'maxLength', 'anyOf', 'const', 'enum', 'minimum', 'maximum', '$ref', '$defs']);

/** The schema a `$ref` names, in the root's `$defs`; a schema with no `$ref` is itself. */
export function resolveRef(s: Schema, root: Schema): Schema {
  if (s.$ref === undefined) return s;
  const name = /^#\/\$defs\/(.+)$/.exec(s.$ref)?.[1];
  const target = name === undefined ? undefined : root.$defs?.[name];
  if (!target) throw new Error(`validator cannot follow ${s.$ref}`);
  return target;
}

export function validate(value: unknown, schema: Schema, path = '$', root: Schema = schema): string[] {
  const s = resolveRef(schema, root);
  for (const k of Object.keys(s)) if (!KEYWORDS.has(k)) throw new Error(`validator does not know ${k}`);
  const kind = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
  if (s.type && s.type !== kind) return [`${path}: expected ${s.type}, got ${kind}`];
  const problems: string[] = [];
  if ('const' in s && value !== s.const) problems.push(`${path}: not ${JSON.stringify(s.const)}`);
  if (s.enum && !s.enum.includes(value)) problems.push(`${path}: not one of ${JSON.stringify(s.enum)}`);
  if (s.anyOf && !s.anyOf.some((option) => validate(value, option, path, root).length === 0)) problems.push(`${path}: matches none of the options`);
  if (typeof value === 'number') {
    if (s.minimum !== undefined && value < s.minimum) problems.push(`${path}: below ${s.minimum}`);
    if (s.maximum !== undefined && value > s.maximum) problems.push(`${path}: above ${s.maximum}`);
  }
  if (typeof value === 'string') {
    if (s.minLength !== undefined && value.length < s.minLength) problems.push(`${path}: too short`);
    if (s.maxLength !== undefined && value.length > s.maxLength) problems.push(`${path}: too long`);
  }
  if (Array.isArray(value)) {
    if (s.minItems !== undefined && value.length < s.minItems) problems.push(`${path}: too few items`);
    if (s.maxItems !== undefined && value.length > s.maxItems) problems.push(`${path}: too many items`);
    if (s.items) value.forEach((item, i) => problems.push(...validate(item, s.items as Schema, `${path}[${i}]`, root)));
  }
  if (kind === 'object') {
    const object = value as Record<string, unknown>;
    for (const name of s.required ?? []) if (!(name in object)) problems.push(`${path}.${name}: missing`);
    for (const [name, v] of Object.entries(object)) {
      const sub = s.properties?.[name];
      if (sub) problems.push(...validate(v, sub, `${path}.${name}`, root));
      else if (s.additionalProperties === false) problems.push(`${path}.${name}: not allowed`);
      else if (typeof s.additionalProperties === 'object') problems.push(...validate(v, s.additionalProperties, `${path}.${name}`, root));
    }
  }
  return problems;
}
