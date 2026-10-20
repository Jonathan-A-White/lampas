// Talk (Settings > The tutor > Talk, mw-06ggew.8): how a hold-to-talk bar is worked and what letting go does, kept on the device. Talk is Hold (hold the bar) or Tap (hold it,
// or tap it to keep the mic on and tap again to stop); Send is On release (what he said goes) or By button (the words wait in the box for him to fix, and Send sends them).
// Every talk bar reads them live through useTalkSettings (src/talkSettings.ts); Hold and On release until he chooses, as every bar was before.
import { defineSetting } from '../define';

export type TalkHow = 'hold' | 'tap';
export type SendHow = 'release' | 'button';

export const talkSetting = defineSetting<TalkHow>({
  key: 'talk',
  default: 'hold',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'hold', label: 'Hold' },
      { value: 'tap', label: 'Tap' },
    ],
  },
  section: 'talk',
  label: 'Talk',
  hint: 'Hold the bar to speak, or tap to start and stop.',
  help: 'How the talk bars are worked. Hold: keep your finger on the bar while you speak, and let go when you are done. Tap: tap the bar to keep the microphone on and tap it again to stop (holding still works too). Hold by default.',
});

export const sendSetting = defineSetting<SendHow>({
  key: 'send',
  default: 'release',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'release', label: 'On release' },
      { value: 'button', label: 'By button' },
    ],
  },
  section: 'talk',
  label: 'Send',
  hint: 'Sent when you let go, or kept in the box to fix.',
  help: 'What happens to your words when the bar lets go. On release: they are sent at once. By button: they wait in the question box on Ask the tutor for you to fix, and the Send button sends them. The other talk bars send on release whatever this says. On release by default.',
});
