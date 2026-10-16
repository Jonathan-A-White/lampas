// scripts/grind-build.ts — writes what the bible-talk grind is told about the settings (`npm run grind:build`) and the ladder's ids the bridge may name in both tutor grinds
// (mw-1vuvq6.5: `bridge` in grinds/bible-talk.answer.schema.json and grinds/verse-ask.answer.schema.json, from src/data/grammar/ladder.ts): the
// `settings_changes` property of grinds/bible-talk.answer.schema.json and the list between the markers of the bible-talk instructions (in the one
// part of grinds/bible-talk.instructions/ that holds them, mw-skwocd.8), both from the settings registry (src/settings/registry.ts). Run it after a
// setting is added to the registry; a second run changes nothing, and tests/unit/bible-talk-grind.test.ts fails when the files are behind.
import { readFileSync, writeFileSync } from 'node:fs';
import { withBridgeIdeas } from '../src/data/grammar/bridge.ts';
import { SETTINGS_BEGIN, formatJson, withSettingsBlock, withSettingsChanges } from '../src/settings/grindText.ts';
import { instructionParts } from './grind-parts.ts';

const SCHEMA = 'grinds/bible-talk.answer.schema.json';
const VERSE_SCHEMA = 'grinds/verse-ask.answer.schema.json';

const holding = instructionParts('bible-talk').filter(({ text }) => text.includes(SETTINGS_BEGIN));
if (holding.length !== 1) throw new Error(`one part of the bible-talk instructions must hold ${SETTINGS_BEGIN}, not ${holding.length}`);
const [{ file: INSTRUCTIONS, text }] = holding;

const schema = withBridgeIdeas(withSettingsChanges(JSON.parse(readFileSync(SCHEMA, 'utf8')) as Record<string, unknown>));
writeFileSync(SCHEMA, `${formatJson(schema)}\n`);
writeFileSync(VERSE_SCHEMA, `${formatJson(withBridgeIdeas(JSON.parse(readFileSync(VERSE_SCHEMA, 'utf8')) as Record<string, unknown>))}\n`);
writeFileSync(INSTRUCTIONS, withSettingsBlock(text));
console.log(`wrote ${SCHEMA}, ${VERSE_SCHEMA} and ${INSTRUCTIONS}`);
