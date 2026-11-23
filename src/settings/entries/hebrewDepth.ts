// src/settings/entries/hebrewDepth.ts — one depth entry per script the tutor writes (SETTINGS slot 230, src/settings/entry.ts; src/script/scripts.ts): Hebrew's is 'hebrewDepth', Settings > Hebrew in the tutor.
import { getScriptDepth, setScriptDepth } from '../../data/repositories';
import { publish } from '../../events/bus';
import { DEFAULT_DEPTH, DEPTHS, SCRIPTS, type Depth } from '../../script/scripts';
import { hebrewFrom } from '../definitions/hebrewInterest';
import { choice, slotted } from '../entry';

export const depthSlot = slotted(
  230,
  SCRIPTS.map((script) =>
    choice(
      script.settingKey,
      script.settingLabel,
      `How the tutor writes a ${script.label} word: its sound, the letters, or both.`,
      DEPTHS.map((d) => ({ value: d.id, label: d.label })),
      () => getScriptDepth(script),
      async (value) => {
        await setScriptDepth(script, value as Depth);
        publish({ kind: 'script-depth-changed', script: script.id, depth: value as Depth });
      },
      {
        section: 'hebrew',
        ai: true,
        dependsOn: hebrewFrom(1),
        help: `How deep into ${script.label} the tutor goes when it writes a ${script.label} word:\n\n${DEPTHS.map((d) => `- **${d.label}** (${d.id}) writes it like ${script.examples[d.id]}`).join('\n')}\n\n${DEPTHS.find((d) => d.id === DEFAULT_DEPTH)?.label} by default.`,
      },
    ),
  ),
);
