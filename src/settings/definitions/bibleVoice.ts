// Bible voice (Settings > Listening > Voices, drawn above the English voice row; mw-82lb97i.6): who reads the English Bible aloud, the recording of David (the Majority Standard
// Bible, streamed from openbible.com) or the phone's voice. The saved values are keyed by the voice's id, so another recorded voice can be added beside 'msb-david' later:
// 'msb-david', 'msb-david-wifi' (the same recording, only on Wi-Fi) and 'phone'. The row is shown always: every English text Lampas reads aloud is the MSB (the Septuagint's
// Brenton has no recording and is never read by it), and where no timings file exists the phone's voice reads whatever is chosen (src/speech/recordedVoice.ts recordingFor).
// src/speech/settingsSync.ts hands the choice to the speaker at start and on change; src/speech/recordedVoice.ts wantsRecording() decides by it when a chapter starts.
// The start is 'Recording on Wi-Fi only' (mw-zbgo4ep.30; src/speech/voiceDecision.ts explains the voice at each Play). The choice 'Recording on Wi-Fi only' is hidden on a phone that cannot tell Wi-Fi from mobile data (src/speech/connection.ts connectionKind() is null): the control hides it
// (src/settings/controls/voice.tsx), the definition lists it so the tutor and a restored copy can still name it.
import { defineSetting } from '../define';

export type BibleVoice = 'msb-david' | 'msb-david-wifi' | 'phone';

/** The credit line the help opens with. */
export const BIBLE_VOICE_CREDIT = 'Recording: Majority Standard Bible, read by David, streamed from openbible.com';

/** The one sentence added to the help on a phone that cannot tell Wi-Fi from mobile data. */
export const NO_WIFI_SENSE = 'This phone cannot tell Wi-Fi from mobile data, so Recording on Wi-Fi only is not offered.';

export const bibleVoiceSetting = defineSetting<BibleVoice>({
  key: 'bibleVoice',
  default: 'msb-david-wifi',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'msb-david', label: 'Recording (David)' },
      { value: 'msb-david-wifi', label: 'Recording on Wi-Fi only' },
      { value: 'phone', label: 'Phone voice' },
    ],
  },
  section: 'voices',
  label: 'Bible voice',
  hint: 'The MSB read by David, streamed, where Lampas has it (John so far); else the phone voice.',
  help: `${BIBLE_VOICE_CREDIT}. The recording plays when you read aloud in English; it needs the internet, nothing is kept on this phone, and your English speed applies. It uses about 1.4 MB a minute (about 86 MB an hour). Books arrive as they are timed (John so far); anywhere else, offline, in Greek or with the weave on, the phone's voice reads as before. Recording on Wi-Fi only (the start) plays it on Wi-Fi and uses the phone's voice on mobile data, asking once if you would rather play David over data. Phone voice always uses the phone's voice.`,
});
