// scripts/grind-build.ts — writes what the bible-talk grind is told about the settings (`npm run grind:build`) and the ladder's ids the bridge may name
// (mw-1vuvq6.5: `bridge` in grinds/bible-talk.answer.schema.json, from src/data/grammar/ladder.ts) and the ids a `work` link may name
// (mw-rfjjzd.10: the `work` enum of grinds/bible-talk.answer.schema.json, from the catalogue, src/resources/workIds.ts), and the tutor client's words (mw-t3xu9a.5): the kit's answer
// fields (asks, do, go, misses, said: voice-kit/talks/grind answerFragment) in the answer schema and the kit's instructions part before the kit marker of
// grinds/bible-talk.instructions/360-the-app-you-can-ask.md. Also: the
// `settings_changes` property of grinds/bible-talk.answer.schema.json and the list between the markers of the bible-talk instructions (in the one
// part of grinds/bible-talk.instructions/ that holds them, mw-skwocd.8), both from the settings registry (src/settings/registry.ts). Run it after a
// setting is added to the registry; a second run changes nothing, and tests/unit/bible-talk-grind.test.ts fails when the files are behind.
import { readFileSync, writeFileSync } from 'node:fs';
import { withBridgeIdeas } from '../src/data/grammar/bridge.ts';
import { withWorkIds } from '../src/resources/workIds.ts';
import { SETTINGS_BEGIN, formatJson, withSettingsBlock, withSettingsChanges } from '../src/settings/grindText.ts';
import { KIT_END, instructionParts, withKitFragment, withKitPart } from './grind-parts.ts';

const SCHEMA = 'grinds/bible-talk.answer.schema.json';

const holding = instructionParts('bible-talk').filter(({ text }) => text.includes(SETTINGS_BEGIN));
if (holding.length !== 1) throw new Error(`one part of the bible-talk instructions must hold ${SETTINGS_BEGIN}, not ${holding.length}`);
const [{ file: INSTRUCTIONS, text }] = holding;

const schema = withKitFragment(withWorkIds(withBridgeIdeas(withSettingsChanges(JSON.parse(readFileSync(SCHEMA, 'utf8')) as Record<string, unknown>))));
writeFileSync(SCHEMA, `${formatJson(schema)}\n`);
writeFileSync(INSTRUCTIONS, withSettingsBlock(text));

const kitHolding = instructionParts('bible-talk').filter(({ text: part }) => part.includes(KIT_END));
if (kitHolding.length !== 1) throw new Error(`one part of the bible-talk instructions must hold ${KIT_END}, not ${kitHolding.length}`);
const [{ file: KIT_PART, text: kitText }] = kitHolding;
writeFileSync(KIT_PART, withKitPart(kitText));
console.log(`wrote ${SCHEMA}, ${INSTRUCTIONS} and ${KIT_PART}`);
