// src/settings/entries/handsFree.ts — the registry entry of Hands-free (SETTINGS slot 410, src/settings/entry.ts).
import { setHandsFree } from '../../handsFree/switch';
import { handsFreeSetting } from '../definitions/handsFree';
import { fromDefinition, slotted } from '../entry';

// A tutor's change (and an undo) goes through the switch the Settings row and the three-finger tap use, so it says 'Hands-free on' or 'off' aloud too (mw-rl10piw.18).
export const handsFreeSlot = slotted(410, { ...fromDefinition(handsFreeSetting), write: async (value) => setHandsFree(handsFreeSetting.parse(value) === 'on') });
