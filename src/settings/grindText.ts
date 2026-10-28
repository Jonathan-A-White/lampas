// src/settings/grindText.ts — what the bible-talk grind is told about the settings: the `settings_changes` part of its answer
// schema and the list of keys and values in its instructions, both made from the registry (src/settings/registry.ts).
// `npm run grind:build` (scripts/grind-build.ts) writes them into grinds/; tests/unit/bible-talk-grind.test.ts fails when the
// files and the registry disagree, so a setting added to the registry is not talkable until the build has been run.
import { helpPlain } from './helpText';
import { MAX_CHANGES, SETTINGS, TEXT_MAX, type SettingEntry } from './registry';

export const SETTINGS_BEGIN = '<!-- settings:begin -->';
export const SETTINGS_END = '<!-- settings:end -->';

/** A choice's values, each with its label up to any subtitle ('Holiness Day by Day: Transformational Thoughts ...' is named by its title); "on" needs no (On). */
const choiceText = (values: readonly { value: string; label: string }[], help = ''): string =>
  runsOf(values)
    .map((run) => {
      const title = run.label.split(': ')[0];
      const quoted = run.values.map((v) => `"${v}"`);
      const named = run.values.length > 2 ? `${quoted[0]} to ${quoted[run.values.length - 1]}` : quoted.join(', ');
      // a label the help already names with its colon ('Atkinson Hyperlegible: Very clear') is not said again beside its value (mw-t3xu9a.5)
      return run.label.toLowerCase() === run.values[0] || help.includes(title) ? named : `${named} (${title})`;
    })
    .join(', ');

/**
 * The values of a choice in runs, so a label is said once for the values that share it (mw-gdcyf98.28): the three Today in Christian History
 * books are one run, and Volume 1 to Volume 6 of a series whose values count the same way ("LLS:365SPURGEON1" to "LLS:365SPURGEON6") are one run
 * with its label written 'Volume 1 to 6'. A run of two is written out, as a range would not be shorter.
 */
function runsOf(values: readonly { value: string; label: string }[]): { values: string[]; label: string }[] {
  const counted = (v: { value: string; label: string }) => {
    const l = /^(.*?)(\d+)(\D*)$/.exec(v.label);
    const k = /^(.*?)(\d+)$/.exec(v.value);
    return l && k ? { lead: l[1], tail: l[3], head: k[1], at: Number(l[2]), by: Number(k[2]) } : undefined;
  };
  const runs: { values: string[]; label: string; last?: ReturnType<typeof counted>; first?: number }[] = [];
  for (const v of values) {
    const run = runs[runs.length - 1];
    const now = counted(v);
    const last = run?.last;
    if (run && v.label === run.label) run.values.push(v.value);
    else if (run && now && last && now.lead === last.lead && now.tail === last.tail && now.head === last.head && now.at === last.at + 1 && now.by === last.by + 1) {
      run.values.push(v.value);
      run.last = now;
    } else runs.push({ values: [v.value], label: v.label, last: now, first: now?.at });
  }
  return runs.map((run) => {
    const { last, first } = run;
    const counting = last !== undefined && first !== undefined && last.at > first;
    return { values: run.values, label: counting ? `${last.lead}${first} to ${last.at}${last.tail}` : run.label };
  });
}

/**
 * A choice whose values are mostly an earlier setting's (todaysDevotional takes the devotionals Which devotional lists) names that setting
 * instead of listing them again: the instructions carry each long list once (mw-5r3p30.728), while the answer schema still lists every value.
 */
function sharedChoice(entry: SettingEntry): string | undefined {
  const { allowed } = entry;
  if (allowed.kind !== 'choice') return undefined;
  for (const earlier of SETTINGS.slice(0, SETTINGS.indexOf(entry))) {
    if (earlier.allowed.kind !== 'choice') continue;
    const theirs = earlier.allowed.values;
    const same = allowed.values.filter((v) => theirs.some((t) => t.value === v.value && t.label === v.label));
    if (same.length < 5) continue;
    const own = allowed.values.filter((v) => !same.includes(v));
    const notHere = theirs.filter((t) => !allowed.values.some((v) => v.value === t.value));
    const but = notHere.length > 0 ? ` but ${notHere.map((t) => `"${t.value}"`).join(', ')}` : '';
    return `${own.length > 0 ? `${choiceText(own)}, or ` : ''}any value of \`${earlier.key}\`${but}`;
  }
  return undefined;
}

function valueText(entry: SettingEntry, help: string): string {
  const { allowed } = entry;
  if (allowed.kind === 'choice') return sharedChoice(entry) ?? choiceText(allowed.values, help);
  if (allowed.kind === 'text') return `text, for example "${allowed.example}" (${allowed.note ?? 'a book, a chapter or a verse; "" for none'})`;
  return `a number from ${allowed.min} to ${allowed.max}, in steps of ${allowed.step}`;
}

/** A setting whose only values are "on" and "off": the instructions say once that it takes those, and the line leaves its Value out. */
const isOnOff = ({ allowed }: SettingEntry): boolean =>
  allowed.kind === 'choice' && allowed.values.length === 2 && allowed.values.some((v) => v.value === 'on') && allowed.values.some((v) => v.value === 'off');

/** The most a setting's help may take of the instructions, in bytes (mw-gdcyf98.2, 400 B; mw-gdcyf98.28, 280 B): a longer help gives way to the setting's hint, which the Value list after it completes. */
export const HELP_MAX_BYTES = 260;

/** The settings whose long help the instructions keep whole: Which devotional lists the devotionals, which the tutor names; Weave says what Solid and + Learning show, which its hint does not; Ask by names the words that switch it, which its hint does not. */
const HELP_KEPT: readonly string[] = ['devotional', 'weave', 'askBy'];

const bytesOf = (text: string): number => new TextEncoder().encode(text).length;

const LANGUAGES = /\b(?:English|Greek|Hebrew)\b/g;

/**
 * The list of keys and values the instructions carry, between the two markers: a setting's help, or its hint when it has no help or its help is longer than HELP_MAX_BYTES.
 * Settings next to each other that say the same but for the language they name (the three voices, the three speeds) are one line (mw-gdcyf98.28):
 * their keys and labels together, the words once, with 'that language' where the first named its own.
 */
export function settingsBlock(): string {
  const lines: { keys: string[]; labels: string[]; body: string; same: string }[] = [];
  for (const s of SETTINGS) {
    const plain = s.help ? helpPlain(s.help) : s.hint;
    const help = !HELP_KEPT.includes(s.key) && s.hint && bytesOf(plain) > HELP_MAX_BYTES ? s.hint : plain;
    const body = `${help}${isOnOff(s) ? '' : ` Value: ${valueText(s, help)}.`}`;
    const same = `${s.label.replace(LANGUAGES, '')}|${body.replace(LANGUAGES, '')}`;
    const last = lines[lines.length - 1];
    if (last && last.same === same && s.label.search(LANGUAGES) >= 0) {
      last.keys.push(s.key);
      last.labels.push(s.label);
      last.body = last.body.replace(LANGUAGES, 'that language');
    } else lines.push({ keys: [s.key], labels: [s.label], body, same });
  }
  return [SETTINGS_BEGIN, ...lines.map((l) => `- ${l.keys.map((k) => `\`${k}\``).join(', ')} — ${l.labels.join(', ')}${/[?!.]$/.test(l.labels[l.labels.length - 1]) ? '' : '.'} ${l.body}`), SETTINGS_END].join('\n');
}

/** `instructions` with the text between its two markers replaced by the registry's list. */
export function withSettingsBlock(instructions: string): string {
  const from = instructions.indexOf(SETTINGS_BEGIN);
  const to = instructions.indexOf(SETTINGS_END);
  if (from < 0 || to < from) throw new Error(`the instructions need ${SETTINGS_BEGIN} and ${SETTINGS_END}`);
  return instructions.slice(0, from) + settingsBlock() + instructions.slice(to + SETTINGS_END.length);
}

/**
 * A grind's instructions read from a directory of parts (grinds/<kind>.instructions/NNN-<section>.md, in name order): each part but the last
 * loses its trailing newlines and one blank line goes between them, as the mill joins them (millwright mw-skwocd.7, joinGrindParts).
 */
export function joinGrindParts(parts: readonly string[]): string {
  return parts.map((part, i) => (i < parts.length - 1 ? part.replace(/\n+$/, '') : part)).join('\n\n');
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
      'The settings he asked to change, each applied at once by the app. Only when he asked for the change in words, never on your own; only the keys and values the instructions list; leave it out when he asked for no change.',
    type: 'array',
    minItems: 1,
    maxItems: MAX_CHANGES,
    items: { anyOf: SETTINGS.map(changeSchema) },
  };
}

/** The `links` kind that names a setting (mw-5r3p30.502): its `key` is one of the registry's, so the tutor cannot link a setting that is not there. */
export function settingLinkSchema(): Json {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['kind', 'key'],
    properties: {
      kind: { const: 'setting' },
      key: {
        description: 'The key of the setting, exactly as the instructions list it.',
        type: 'string',
        enum: SETTINGS.map((s) => s.key),
      },
    },
  };
}

/** `schema` with its `settings_changes` property and the setting kind of its `links` set to the registry's. */
export function withSettingsChanges(schema: Json): Json {
  const properties: Json = { ...(schema.properties as Json), settings_changes: settingsChangesSchema() };
  const links = properties.links as Json | undefined;
  if (links) {
    const items = links.items as Json;
    const others = (items.anyOf as Json[]).filter((v) => ((v.properties as Json).kind as Json).const !== 'setting');
    properties.links = { ...links, items: { ...items, anyOf: [...others, settingLinkSchema()] } };
  }
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
