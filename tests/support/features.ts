// tests/support/features.ts — reads the tags of every scenario under features/ (mw-5r3p30.903, docs/language-parity.md). A scenario's tags are
// its own and its Feature's (Gherkin's inheritance; vitest-cucumber's includeTags reads a scenario's own tags only, so a Feature-level tag is for
// this reader and the docs, never for splitting a feature's steps). A tag line before `Examples:` is refused: vitest-cucumber would hang it on the
// next scenario. The language-parity test and scripts/language-parity-docs.ts share this file.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const FEATURES_DIR = 'features';

export interface TaggedScenario {
  /** the feature file's name without `.feature`: 'hebrew-reader' */
  file: string;
  /** the scenario's title, trimmed */
  title: string;
  /** the scenario's own tags and its Feature's, without the `@`, in order, each once */
  tags: string[];
  /** the 1-based line of the Scenario keyword */
  line: number;
}

export interface TaggedFeature {
  file: string;
  /** the tags on the Feature line, without the `@` */
  tags: string[];
  scenarios: TaggedScenario[];
}

const tagsOf = (line: string): string[] =>
  line
    .split(/\s+/)
    .filter((part) => part.startsWith('@'))
    .map((part) => part.slice(1));

/** The Feature and scenarios of one .feature text. Throws on a tag line left before `Examples:` (it would hang on the next scenario). */
export function readFeature(file: string, text: string): TaggedFeature {
  const feature: TaggedFeature = { file, tags: [], scenarios: [] };
  let pending: string[] = [];
  let ruleTags: string[] = [];
  text.split('\n').forEach((raw, index) => {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) return;
    if (line.startsWith('@')) {
      pending.push(...tagsOf(line));
      return;
    }
    if (/^Feature:/.test(line)) {
      feature.tags = pending;
      pending = [];
      return;
    }
    if (/^Rule:/.test(line)) {
      ruleTags = pending;
      pending = [];
      return;
    }
    if (/^(Scenario|Scenario Outline|Scenario Template|Example):/.test(line)) {
      const title = line.replace(/^[^:]+:\s*/, '');
      const tags = [...new Set([...feature.tags, ...ruleTags, ...pending])];
      feature.scenarios.push({ file, title, tags, line: index + 1 });
      pending = [];
      return;
    }
    if (/^(Background|Examples|Scenarios):/.test(line)) {
      if (pending.length > 0) throw new Error(`${file}.feature:${index + 1}: tags before ${line.split(':')[0]} (vitest-cucumber hangs them on the next scenario)`);
      return;
    }
  });
  return feature;
}

/** Every feature under features/, by file name. */
export function readFeatures(dir: string = FEATURES_DIR): TaggedFeature[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.feature'))
    .sort()
    .map((name) => readFeature(name.replace(/\.feature$/, ''), readFileSync(join(dir, name), 'utf8')));
}
