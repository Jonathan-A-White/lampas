// scripts/grind-parts.ts — a grind's instructions as the mill reads them (mw-skwocd.8). grinds/<kind>.json's `instructions` names one file
// (grinds/tips.instructions.md) or a directory of parts, one per section (grinds/bible-talk.instructions/NNN-<section>.md), whose *.md files the
// mill reads in name order and joins with one blank line (src/settings/grindText.ts joinGrindParts). npm run grind:build writes through
// instructionParts, and every test reads a grind's instructions through instructionsOf (tests/unit/grind-parts.test.ts holds them to it).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { answerFragment, instructionsPart } from 'voice-kit/talks/grind';
import { joinGrindParts } from '../src/settings/grindText.ts';

/** What grinds/<kind>.json names as its instructions: a file or a directory, relative to the repository. */
export function instructionsPath(kind: string): string {
  const grind = JSON.parse(readFileSync(`grinds/${kind}.json`, 'utf8')) as { instructions?: unknown };
  if (typeof grind.instructions !== 'string') throw new Error(`grinds/${kind}.json names no instructions`);
  return grind.instructions;
}

/** The instructions' parts in the order the mill reads them: the one file, or the directory's *.md files by name. */
export function instructionParts(kind: string): { file: string; text: string }[] {
  const path = instructionsPath(kind);
  if (!statSync(path).isDirectory()) return [{ file: path, text: readFileSync(path, 'utf8') }];
  const names = readdirSync(path)
    .filter((name) => name.endsWith('.md'))
    .sort();
  if (names.length === 0) throw new Error(`${path} holds no *.md part`);
  return names.map((name) => ({ file: `${path}/${name}`, text: readFileSync(`${path}/${name}`, 'utf8') }));
}

/** A grind's instructions whole, as the model is told them. */
export function instructionsOf(kind: string): string {
  return joinGrindParts(instructionParts(kind).map(({ text }) => text));
}

/** The marker that ends the kit's words in the part that carries them (grinds/bible-talk.instructions/360-the-app-you-can-ask.md): `npm run grind:build` writes the kit's instructions part before it (mw-t3xu9a.5). */
export const KIT_END = '<!-- kit:end -->';

/** `part` with everything before the kit marker replaced by voice-kit's instructions part (voice-kit/talks/grind), byte for byte. */
export function withKitPart(part: string): string {
  const to = part.indexOf(KIT_END);
  if (to < 0) throw new Error(`the part needs ${KIT_END}`);
  return instructionsPart + part.slice(to);
}

/** An answer schema with voice-kit's answer fields (asks, do, go, misses, said) as the kit gives them: the kit's `go` replaces any `go` of the app's own. */
export function withKitFragment<T extends { properties?: unknown }>(schema: T): T {
  return { ...schema, properties: { ...(schema.properties as Record<string, unknown>), ...answerFragment.properties } };
}
