// src/settings/grindText.ts — what the bible-talk grind is told about the settings: the `settings_changes` part of its answer
// schema and the list of keys and values in its instructions, both made from the registry (src/settings/registry.ts).
// `npm run grind:build` (scripts/grind-build.ts) writes them into grinds/; tests/unit/bible-talk-grind.test.ts fails when the
// files and the registry disagree, so a setting added to the registry is not talkable until the build has been run.
import { MAX_CHANGES, SETTINGS, TEXT_MAX, type SettingEntry } from './registry';

export const SETTINGS_BEGIN = '<!-- settings:begin -->';
export const SETTINGS_END = '<!-- settings:end -->';

function valueText(entry: SettingEntry): string {
  const { allowed } = entry;
  if (allowed.kind === 'choice') return allowed.values.map((v) => `"${v.value}" (${v.label})`).join(', ');
  if (allowed.kind === 'text') return `text, for example "${allowed.example}" (a book, a chapter or a verse; "" for none)`;
  return `a number from ${allowed.min} to ${allowed.max}, in steps of ${allowed.step}`;
}

/** The list of keys and values the instructions carry, between the two markers. */
export function settingsBlock(): string {
  const lines = SETTINGS.map((s) => `- \`${s.key}\` — ${s.label}. ${s.hint}${s.help ? ` ${s.help}` : ''} Value: ${valueText(s)}.`);
  return [SETTINGS_BEGIN, ...lines, SETTINGS_END].join('\n');
}

/** `instructions` with the text between its two markers replaced by the registry's list. */
export function withSettingsBlock(instructions: string): string {
  const from = instructions.indexOf(SETTINGS_BEGIN);
  const to = instructions.indexOf(SETTINGS_END);
  if (from < 0 || to < from) throw new Error(`the instructions need ${SETTINGS_BEGIN} and ${SETTINGS_END}`);
  return instructions.slice(0, from) + settingsBlock() + instructions.slice(to + SETTINGS_END.length);
}

type Json = Record<string, unknown>;

function valueSchema({ allowed }: SettingEntry): Json {
  if (allowed.kind === 'choice') return { type: 'string', enum: allowed.values.map((v) => v.value) };
  if (allowed.kind === 'text') return { type: 'string', maxLength: TEXT_MAX };
  return { type: 'number', minimum: allowed.min, maximum: allowed.max };
}

function changeSchema(entry: SettingEntry): Json {
  const value = valueSchema(entry);
  return {
    type: 'object',
    additionalProperties: false,
    required: ['key', 'value'],
    properties: { key: { const: entry.key }, value },
  };
}

/** The `settings_changes` property of the answer schema: a list of changes, each one setting with the values it allows. */
export function settingsChangesSchema(): Json {
  return {
    description:
      'The settings he asked to change, each applied at once by the app. Only the keys and values the instructions list; leave it out when he asked for no change.',
    type: 'array',
    maxItems: MAX_CHANGES,
    items: { anyOf: SETTINGS.map(changeSchema) },
  };
}

/** `schema` with its `settings_changes` property set to the registry's. */
export function withSettingsChanges(schema: Json): Json {
  const properties = { ...(schema.properties as Json), settings_changes: settingsChangesSchema() };
  return { ...schema, properties };
}

const INLINE_MAX = 140;

const inline = (value: unknown): string => {
  if (Array.isArray(value)) return value.length === 0 ? '[]' : `[${value.map(inline).join(', ')}]`;
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value);
    return entries.length === 0 ? '{}' : `{ ${entries.map(([k, v]) => `${JSON.stringify(k)}: ${inline(v)}`).join(', ')} }`;
  }
  return JSON.stringify(value);
};

/** The schema file's layout: two spaces, and any array or object that fits in a line is written on one. */
export function formatJson(value: unknown, depth = 0): string {
  const short = inline(value);
  if (typeof value !== 'object' || value === null || depth * 2 + short.length <= INLINE_MAX) return short;
  const pad = ' '.repeat((depth + 1) * 2);
  const end = ' '.repeat(depth * 2);
  if (Array.isArray(value)) return `[\n${value.map((v) => pad + formatJson(v, depth + 1)).join(',\n')}\n${end}]`;
  const lines = Object.entries(value).map(([k, v]) => `${pad}${JSON.stringify(k)}: ${formatJson(v, depth + 1)}`);
  return `{\n${lines.join(',\n')}\n${end}}`;
}
