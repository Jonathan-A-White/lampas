// src/sermons/sources/service.ts — a sermon source the index service has and the bundle lacks (docs/sermons.md 'When online'): it holds no rows, so the Sermons sheet gets them from the service alone, only while
// the source's switch is On. Its On | Off row is made in Settings the first time the source is seen (src/settings/registry.ts); Off to start unless the service says `on_by_default`.
import type { KnownSermonSource } from '../../data/repositories/sermonSources';
import type { SermonSource } from '../types';

export const serviceSource = (known: KnownSermonSource): SermonSource => ({
  id: known.id,
  name: known.name,
  homepage: known.homepage,
  credit: known.credit,
  describe: 'Listed by the sermon index online.',
  default: known.onByDefault ? 'on' : 'off',
  ...(known.by === undefined ? {} : { by: known.by }),
  sermonsFor: async () => [],
});
