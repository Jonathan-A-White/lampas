// scripts/grind-build.ts — writes what the bible-talk grind is told about the settings (`npm run grind:build`): the
// `settings_changes` property of grinds/bible-talk.answer.schema.json and the list between the markers of
// grinds/bible-talk.instructions.md, both from the settings registry (src/settings/registry.ts). Run it after a setting is added
// to the registry; a second run changes nothing, and tests/unit/bible-talk-grind.test.ts fails when the files are behind.
import { readFileSync, writeFileSync } from 'node:fs';
import { formatJson, withSettingsBlock, withSettingsChanges } from '../src/settings/grindText.ts';

const SCHEMA = 'grinds/bible-talk.answer.schema.json';
const INSTRUCTIONS = 'grinds/bible-talk.instructions.md';

const schema = withSettingsChanges(JSON.parse(readFileSync(SCHEMA, 'utf8')) as Record<string, unknown>);
writeFileSync(SCHEMA, `${formatJson(schema)}\n`);
writeFileSync(INSTRUCTIONS, withSettingsBlock(readFileSync(INSTRUCTIONS, 'utf8')));
console.log(`wrote ${SCHEMA} and ${INSTRUCTIONS}`);
