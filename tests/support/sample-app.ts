// tests/support/sample-app.ts — a study app that is not a real one, for the specs of what any 'app' resource does (the Get <App> and Turn off <App>
// sheet when its link does not open, the field and the Get link in Settings): no listed resource has an app link with no https fallback
// since the one that had it was unlisted (mw-5r3p30.738), so a spec that needs one lists this one. A feature's steps use it with
//   vi.mock('../../src/resources/index', async (original) => (await import('../../tests/support/sample-app')).withSampleApp(await original()));
import type { StudyResource } from '../../src/resources/types';

export const sampleApp: StudyResource = {
  id: 'sampleapp',
  lang: 'both',
  name: 'Lexapp',
  kind: 'app',
  describe: 'Adds Open in Lexapp: the word in your own lexicon in the Lexapp app.',
  option: {
    label: 'Lexapp resource',
    default: 'BDAG',
    hint: 'The lexicon module as Lexapp names it, such as BDAG. Empty means BDAG.',
  },
  linksFor: (word, option) => {
    const lexicon = option?.trim() || 'BDAG';
    return [{ label: 'Open in Lexapp', tile: lexicon, url: `lexapp://search/${encodeURIComponent(lexicon)}?${encodeURIComponent(word.lemma)}` }];
  },
};

type ResourcesModule = typeof import('../../src/resources/index');

/** The real resources module with the sample app listed after the others (and found by `resourceOf`). */
export function withSampleApp(original: ResourcesModule): ResourcesModule {
  const RESOURCES = [...original.RESOURCES, sampleApp];
  return { ...original, RESOURCES, resourceOf: (id: string) => RESOURCES.find((r) => r.id === id) };
}
