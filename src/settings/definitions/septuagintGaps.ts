// Show manuscript gaps (Settings home, under 'How much Greek?', mw-u2w5klk.280): whether the Septuagint's Greek view prints Swete's lacuna brackets. Swete prints Codex Alexandrinus for Genesis (Codex Vaticanus
// lacks it) and brackets the letters lost from its damaged leaves ('[Καὶ συνετε]λέσθησαν'), supplied from other witnesses. Off to start: the Greek reads clean. Drawn once the Septuagint is on (it
// changes nothing else). Display only: the data files keep Swete's printing and loadSeptuagintChapter keeps it in each word's `d`. PROVISIONAL: the Governor confirms it.
import { defineSetting } from '../define';

export type SeptuagintGaps = 'on' | 'off';

export const septuagintGapsSetting = defineSetting<SeptuagintGaps>({
  key: 'septuagintGaps',
  default: 'off',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
  },
  section: 'dial',
  label: 'Show manuscript gaps',
  hint: 'Swete’s lost-letter brackets.',
  help: 'On: the Septuagint’s Greek view prints Swete’s square brackets as he did. They mark letters lost from a damaged leaf of the manuscript (for Genesis, Codex Alexandrinus) and supplied from other witnesses, as in “[Καὶ συνετε]λέσθησαν”. Off: the Greek reads without them. A tap on a word opens the same card either way. Drawn only while the Old Testament in Greek (Septuagint) is on.',
  dependsOn: { key: 'septuagint', shown: (value) => value === 'on' },
});
