// tests/unit/one-text-size.test.ts — an element's className never holds two text-size utilities at once (mw-svw421.30).
// Tailwind builds its utilities in its own order, so of text-lg and text-3xl on one element the later in the built CSS wins, not the later in the string:
// GrammarCard's Greek options asked for text-3xl and were drawn at 18 px by a text-lg beside it. A size with a variant in front (short:text-2xl) is another
// rule and may stand beside an unprefixed one; the two branches of a ternary are never on one element at once.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const SIZE = /^text-(?:xs|sm|base|lg|xl|[2-9]xl|\[\d[^\]]*\])$/;
/** more alternatives than this and the rest of an expression is not followed (a cap on the product of nested ternaries) */
const MAX_ALTERNATIVES = 64;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return path.endsWith('.tsx') ? [path] : [];
  });
}

/** The strings a className expression can come to: a ternary gives either branch, a && gives its right side or nothing, a const of the same file gives its value, what is not written out gives ''. */
function alternatives(node: ts.Node, consts: ReadonlyMap<string, ts.Expression>, seen: readonly string[] = []): string[] {
  const join2 = (a: string[], b: string[]) => a.flatMap((x) => b.map((y) => `${x} ${y}`)).slice(0, MAX_ALTERNATIVES);
  if (ts.isStringLiteralLike(node)) return [node.text];
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node)) return alternatives(node.expression, consts, seen);
  if (ts.isJsxExpression(node)) return node.expression ? alternatives(node.expression, consts, seen) : [''];
  if (ts.isConditionalExpression(node)) return [...alternatives(node.whenTrue, consts, seen), ...alternatives(node.whenFalse, consts, seen)];
  if (ts.isIdentifier(node)) {
    const value = consts.get(node.text);
    return value && !seen.includes(node.text) ? alternatives(value, consts, [...seen, node.text]) : [''];
  }
  if (ts.isTemplateExpression(node)) {
    return node.templateSpans.reduce((soFar, span) => join2(join2(soFar, alternatives(span.expression, consts, seen)), [span.literal.text]), [node.head.text]);
  }
  if (ts.isBinaryExpression(node)) {
    const op = node.operatorToken.kind;
    if (op === ts.SyntaxKind.PlusToken) return join2(alternatives(node.left, consts, seen), alternatives(node.right, consts, seen));
    if (op === ts.SyntaxKind.AmpersandAmpersandToken) return ['', ...alternatives(node.right, consts, seen)];
    if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken) return [...alternatives(node.left, consts, seen), ...alternatives(node.right, consts, seen)];
  }
  return [''];
}

/** The text sizes, each once, that a string of classes holds with no variant in front. */
function sizesOf(classes: string): string[] {
  return [...new Set(classes.split(/\s+/).filter((c) => SIZE.test(c)))];
}

/** The file's top-level and local consts by name (a name declared twice keeps the first), for a className built from a const. */
function constsOf(source: ts.SourceFile): Map<string, ts.Expression> {
  const consts = new Map<string, ts.Expression>();
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && !consts.has(node.name.text)) consts.set(node.name.text, node.initializer);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return consts;
}

function parse(file: string, text: string): ts.SourceFile {
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

/** 'file:line: classes' for each className that can hold two sizes at once. */
function offencesIn(source: ts.SourceFile): string[] {
  const consts = constsOf(source);
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxAttribute(node) && node.name.getText() === 'className' && node.initializer) {
      const clash = alternatives(node.initializer, consts).map(sizesOf).find((sizes) => sizes.length > 1);
      if (clash) found.push(`${source.fileName}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}: ${clash.join(' and ')}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe('text size classes', () => {
  it('are one to an element in every component', () => {
    expect(sources('src').flatMap((file) => offencesIn(parse(file, readFileSync(file, 'utf8'))))).toEqual([]);
  });

  it('see the clash GrammarCard had: text-lg beside a ternary that holds text-3xl', () => {
    const old = parse('x.tsx', 'const BASE = "px-4 text-lg"; const a = <b className={`${BASE} ${greek ? `font-greek ${side ? "text-3xl short:text-2xl" : "text-3xl"}` : "text-left"}`} />;');
    expect(offencesIn(old)).toEqual(['x.tsx:1: text-lg and text-3xl']);
  });

  it('pass a ternary whose branches each hold one size', () => {
    const fine = parse('x.tsx', 'const a = <b className={`${greek ? "text-3xl" : "text-lg"} text-left`} />;');
    expect(offencesIn(fine)).toEqual([]);
  });

  it('let a variant size stand beside a plain one, and the branches of a ternary stand apart', () => {
    expect(sizesOf('text-3xl short:text-2xl')).toEqual(['text-3xl']);
    expect(sizesOf('text-center text-muted text-accent')).toEqual([]);
  });
});
