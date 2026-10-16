// scripts/grind-parts.ts — a grind's instructions as the mill reads them (mw-skwocd.8). grinds/<kind>.json's `instructions` names one file
// (grinds/tips.instructions.md) or a directory of parts, one per section (grinds/bible-talk.instructions/NNN-<section>.md), whose *.md files the
// mill reads in name order and joins with one blank line (src/settings/grindText.ts joinGrindParts). npm run grind:build writes through
// instructionParts, and every test reads a grind's instructions through instructionsOf (tests/unit/grind-parts.test.ts holds them to it).
import { readFileSync, readdirSync, statSync } from 'node:fs';
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
