// no-layer-inversion: a lower layer does not import a higher one (mw-6ww.175.12; the layers are in eslint-rules/layers.js).
// data < shared (ui, services) < features (everything else). The breaks that were there when the rule came are listed in
// eslint-rules/layer-inversions.json as 'importer -> imported'; that list may only get shorter (tests/unit/layers.test.ts).
import { createRequire } from 'node:module';
import path from 'node:path';
import { inversionKey, resolveImport } from './layers.js';

const require = createRequire(import.meta.url);
const ALLOWED = new Set(require('./layer-inversions.json'));

const MESSAGE = (from, to) =>
  `${from} is in a lower layer than ${to} and may not import it (data < shared: ui, services < features: screens and the rest; eslint-rules/layers.js). ` +
  'Move what it needs down (a type, a constant) or take it as an argument. Do not add a line to eslint-rules/layer-inversions.json: that list may only get shorter.';

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Refuse an import of a higher layer from a lower one in src/' },
    schema: [],
    messages: { inverted: '{{ text }}' },
  },
  create(context) {
    const root = context.cwd;
    const fromRel = path.relative(root, context.filename).split(path.sep).join('/');
    const check = (node, spec) => {
      if (typeof spec !== 'string') return;
      const toRel = resolveImport(root, fromRel, spec);
      if (!toRel) return;
      const key = inversionKey(fromRel, toRel);
      if (key && !ALLOWED.has(key)) context.report({ node, messageId: 'inverted', data: { text: MESSAGE(fromRel, toRel) } });
    };
    return {
      ImportDeclaration: (node) => check(node.source, node.source.value),
      ExportNamedDeclaration: (node) => node.source && check(node.source, node.source.value),
      ExportAllDeclaration: (node) => check(node.source, node.source.value),
      ImportExpression: (node) => node.source.type === 'Literal' && check(node.source, node.source.value),
      // import('./x').Y in a type
      TSImportType: (node) => {
        const arg = node.source ?? node.argument; // typescript-eslint 8.x names it argument, newer source
        if (arg?.literal) check(arg, arg.literal.value);
        else if (arg?.type === 'Literal') check(arg, arg.value);
      },
    };
  },
};
