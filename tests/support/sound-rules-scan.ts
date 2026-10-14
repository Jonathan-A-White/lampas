// tests/support/sound-rules-scan.ts — finds a Greek sound rule written outside the pronunciation schemes (mw-5r3p30.268): every sound the app says,
// spells or describes comes from the chosen scheme (src/speech/pronunciation.ts and src/speech/schemes/), so another (Erasmian) plugs in without
// touching the rest. tests/unit/one-pronunciation-scheme.test.ts runs it over src/ and grinds/.
//
// In a .ts/.tsx file only what the app shows, speaks or sends is read (string literals, template text and JSX text) and the imports; comments are
// the code's own notes and may name a sound. A grind's instructions and schemas are read whole: the tutor reads every word of them.
import ts from 'typescript';

/** The files that own the sounds: anything may be written here. */
export const SCHEME_FILES = ['src/speech/pronunciation.ts', 'src/speech/schemes/'];

export interface SoundRule {
  /** what kind of sound rule it is */
  rule: string;
  /** the text that matched */
  text: string;
}

/** The patterns of a sound rule, each with a name, found by searching the source for 'as in', 'like the', respellings and hand-named schemes. */
export const SOUND_PATTERNS: readonly { rule: string; pattern: RegExp }[] = [
  // 'e as in pet', 'v, as in “vase”'
  { rule: 'a sound keyed to an English word', pattern: /\b[a-z]{1,3},? as in [“"'`]?[A-Za-z]/g },
  // 'like the ch of Scottish loch', 'dh, the th of “this”'
  { rule: 'a sound likened to an English letter', pattern: /\bthe [a-z]{1,2} (?:of|in) [“"'`]?(?:Scottish )?[A-Za-z]/g },
  // 'β is v', 'αι is e', 'ει, οι and υι are ee', 'ου says oo'
  {
    rule: 'a Greek letter given a Latin sound',
    pattern:
      /(?<![\p{Script=Greek}\p{M}])\p{Script=Greek}[\p{Script=Greek}\p{M}]{0,2}(?:(?:,| and| or),? \p{Script=Greek}[\p{Script=Greek}\p{M}]{0,2})* (?:is|are|says|sounds like) (?:the |a |an )?(?:soft |hard |breathy )?[“"'`]?(?!(?:the|a|an|in|of|not|one|it|its|so|said|also|only|part|used|on|to|at|by|no|how)\b)[a-z]{1,4}\b(?![-'’])/gu,
  },
  // 'TAF-ta', 'khree-STO', 'PAN-do-te': a word cut into syllables, the stressed one in capitals (a language tag, 'el-GR', is not one)
  { rule: 'a respelling', pattern: /(?<![\w-])(?![a-z]{2,3}-[A-Z]{2}(?![\w-]))(?:[a-z]+-)*[A-Z]{2,}(?:-[a-z]+)+(?![\w-])|(?<![\w-])(?![a-z]{2,3}-[A-Z]{2}(?![\w-]))(?:[a-z]+-)+[A-Z]{2,}(?:-[a-z]+)*(?![\w-])/g },
  // 'in modern Greek', 'the Erasmian (school) pronunciation'
  { rule: 'a pronunciation named by hand', pattern: /\b(?:[Mm]odern (?:Greek|pronunciation)|Erasmian)\b/g },
];

const owned = (file: string): boolean => SCHEME_FILES.some((f) => (f.endsWith('/') ? file.startsWith(f) : file === f));

function matchesIn(text: string): SoundRule[] {
  const found: SoundRule[] = [];
  for (const { rule, pattern } of SOUND_PATTERNS) for (const m of text.matchAll(pattern)) found.push({ rule, text: m[0] });
  return found;
}

/** What the app shows, speaks or sends from a TypeScript file, piece by piece, and the modules it imports. */
function scriptParts(file: string, source: string): { texts: string[]; imports: string[] } {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const texts: string[] = [];
  const imports: string[] = [];
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push(node.moduleSpecifier.text);
      return;
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) imports.push(node.arguments[0].text);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) texts.push(node.text);
    else if (ts.isJsxText(node)) texts.push(node.text.replace(/\s+/g, ' '));
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { texts, imports };
}

/** The sound rules `text` (the contents of `file`, a path from the repo's root) writes outside the schemes; none for a scheme's own file. */
export function soundRulesIn(file: string, text: string): SoundRule[] {
  if (owned(file)) return [];
  if (!/\.(ts|tsx)$/.test(file)) return matchesIn(text.replace(/\s+/g, ' '));
  const { texts, imports } = scriptParts(file, text);
  const found = texts.flatMap(matchesIn);
  for (const spec of imports) if (/(^|\/)schemes\//.test(spec)) found.push({ rule: 'a scheme imported by name, not asked of the registry', text: spec });
  return found;
}
