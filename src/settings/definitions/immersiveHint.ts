// Immersive reader card (Settings > Immersive reader, shown while Immersive reader is On): whether the Reader opens with the small card that says
// how the Immersive reader works (src/ImmersiveHint.tsx). The card's "Don't show this again" sets it to Off; switching it On brings the card back.
import { defineSetting } from '../define';

export type ImmersiveHint = 'on' | 'off';

export const immersiveHintSetting = defineSetting<ImmersiveHint>({
  key: 'immersiveHint',
  default: 'on',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
  },
  section: 'immersive',
  label: 'Immersive reader card',
  hint: 'A small card on the text that says how to bring the bars back.',
  help: 'While Immersive reader is On, the Reader opens with a small card above the text that says how the bars slide away, how to bring them back and how to leave. Its button "Got it" closes it until the next time the Reader opens; "Don\'t show this again" switches this to Off. Switch it back On to see the card again. On by default.',
  dependsOn: { key: 'immersiveReader', shown: (value) => value === 'on' },
});
