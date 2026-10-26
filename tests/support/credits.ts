// What the credits test checks besides "every dependency is credited" (mw-vtjxh4.12): credits follow removals.
//  - A credit has a kind, its ATTRIBUTION.md section. The sections in PACKAGE_SECTIONS list npm packages, each in `backticks`; every
//    such package must still be in package.json (dependencies or devDependencies). The other sections (texts, type, services,
//    ideas, tools) are not packages: their backticks (a licence file, a subpath) are left alone.
//  - Every font file and every shipped data file is named by a credit (bundledFiles: which credit each one needs).
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { OT_BOOKS } from '../../src/data/books';

export interface CreditSection {
  title: string | null;
  entries: string[];
}

export const PACKAGE_SECTIONS = ['Libraries the app runs on'];

/** `voice-kit/speech` is the package voice-kit; `@bsv/sdk/primitives` is @bsv/sdk. */
export function packageOf(token: string): string {
  const parts = token.split('/');
  return token.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/** Every package that a credit of a package section names, once, in order. */
export function creditedPackages(sections: CreditSection[]): string[] {
  const names: string[] = [];
  for (const section of sections) {
    if (section.title === null || !PACKAGE_SECTIONS.includes(section.title)) continue;
    for (const entry of section.entries) {
      for (const m of entry.matchAll(/`([^`]+)`/g)) {
        const name = packageOf(m[1]);
        if (!names.includes(name)) names.push(name);
      }
    }
  }
  return names;
}

/** The packages that credits name and `installed` (dependencies and devDependencies) no longer holds. */
export function stalePackages(sections: CreditSection[], installed: string[]): string[] {
  return creditedPackages(sections).filter((name) => !installed.includes(name));
}

export interface BundledFile {
  path: string;
  /** a word of the credit that must appear in ATTRIBUTION.md (case and hyphens ignored); undefined = no rule knows this file */
  credit: string | null | undefined;
}

const FONT = /\.(woff2?|ttf|otf)$/i;
// fontsource names a file <family>-<subset>-<weight>-<style>.woff2
const FAMILY = /^(.+?)-(?:greek-ext|greek|hebrew|latin-ext|latin|cyrillic-ext|cyrillic|vietnamese)-\d+-(?:normal|italic)\.\w+$/;

function walk(root: string, dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walk(root, path));
    else out.push(path);
  }
  return out;
}

function creditFor(path: string): string | null | undefined {
  if (path.startsWith('src/fonts/')) {
    const file = path.slice('src/fonts/'.length);
    if (!FONT.test(file)) return null; // a licence text, not a font
    return (FAMILY.exec(file)?.[1] ?? file.replace(FONT, '')).replace(/-/g, ' ');
  }
  if (path === 'public/data/lexicon.json') return 'TBESG';
  if (path === 'public/data/lexicon-hbo.json') return 'TBESH'; // the Hebrew lemmas, with TBESH's glosses (scripts/data-build-ot.ts)
  if (OT_BOOKS.some((b) => path.startsWith(`public/data/${b.code}/`))) return 'Berean Standard Bible'; // the Old Testament: the Berean tables, whose English the Majority Standard Bible's Old Testament is
  if (path === 'public/data/frequency-hbo.json') return 'Berean Standard Bible';
  if (path.startsWith('public/data/')) return 'Majority Standard Bible';
  if (path.startsWith('public/lemma-forms/')) return 'Majority Standard Bible'; // the forms of each lemma the text uses, made from the chapters (scripts/build-lemma-forms.mjs)
  if (path.startsWith('public/sounds/')) return 'eSpeak NG'; // the clips of a one-letter Greek word's sound, made by eSpeak NG (scripts/sounds-build.sh)
  if (path.startsWith('public/sounds-trial/')) {
    // the listening page's clips (docs/research/letter-sounds.md): one folder per voice that made them
    const voice = path.split('/')[2];
    return { espeak: 'eSpeak NG', piper: 'Piper', coqui: 'Coqui', chatterbox: 'Chatterbox' }[voice];
  }
  if (path.startsWith('public/pictures/')) return 'Claude Code'; // the memory pictures: drawn by Claude Code, credited as a tool
  // the app's own: the lamp icon (also Claude Code's drawing), the changelog mw next writes, and the letter-sounds listening page (its clips are credited above)
  if (/^public\/(icon\.svg|icon-\d+\.png|changelog\.json|sounds-trial\.html)$/.test(path)) return null;
  return undefined;
}

/**
 * Every font file (src/fonts) and everything the app ships from public/ with the credit it needs. A new directory under public/
 * or a new kind of file has no rule: uncreditedFiles lists it until a rule here and an entry in ATTRIBUTION.md exist.
 */
export function bundledFiles(root: string, opts: { extra?: string[] } = {}): BundledFile[] {
  const paths = [...walk(root, 'src/fonts'), ...walk(root, 'public'), ...(opts.extra ?? [])];
  return paths.map((path) => ({ path, credit: creditFor(path) })).filter((f) => f.credit !== null);
}

const fold = (s: string): string => s.toLowerCase().replace(/-/g, ' ');
const namesCredit = (foldedText: string, credit: string): boolean =>
  new RegExp(`(^|[^a-z0-9])${fold(credit).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`).test(foldedText);

/** The files whose credit ATTRIBUTION.md's plain text does not name, written as 'path (credit: x)' or 'path (no credit rule)'. */
export function uncreditedFiles(files: BundledFile[], creditsText: string): string[] {
  const text = fold(creditsText);
  const missing: string[] = [];
  for (const f of files) {
    if (f.credit === undefined || f.credit === null) missing.push(`${f.path} (no credit rule: add one in tests/support/credits.ts and an entry in ATTRIBUTION.md)`);
    else if (!namesCredit(text, f.credit)) missing.push(`${f.path} (credit: ${f.credit})`);
  }
  return missing;
}
