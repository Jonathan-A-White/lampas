// no-new-repository-exports: the repositories barrel (src/data/repositories/index.ts) takes no new export (mw-6ww.175.84, stage 4 of the registry investment).
// It had 113 commits in 90 days and is imported by 157 source files and 213 test files, so every new repository added to it is a conflict for the next story.
// What it exports today is listed in eslint-rules/repository-exports.json as 'source#name' (a type counts like a value); the list may only get shorter.
// A new repository is imported from its own file ('../data/repositories/<file>'). Emptying the barrel is a later investment.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ALLOWED = new Set(require('./repository-exports.json'));

const MESSAGE = (key) =>
  `${key} is a new export of the repositories barrel, which is frozen (eslint-rules/no-new-repository-exports.js). ` +
  "Import it from its own file ('src/data/repositories/<file>') instead. Do not add it to eslint-rules/repository-exports.json: that list may only get shorter.";

const nameOf = (node) => (node.type === 'Identifier' ? node.name : String(node.value));

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Refuse a new export in the repositories barrel' },
    schema: [],
    messages: { added: '{{ text }}' },
  },
  create(context) {
    const check = (node, key) => {
      if (!ALLOWED.has(key)) context.report({ node, messageId: 'added', data: { text: MESSAGE(key) } });
    };
    return {
      ExportAllDeclaration: (node) => check(node, `${node.source.value}#${node.exported ? nameOf(node.exported) : '*'}`),
      ExportDefaultDeclaration: (node) => check(node, '#default'),
      ExportNamedDeclaration(node) {
        const from = node.source ? String(node.source.value) : '';
        for (const s of node.specifiers) check(s, `${from}#${nameOf(s.exported)}`);
        const d = node.declaration;
        if (!d) return;
        if (d.type === 'VariableDeclaration') {
          for (const v of d.declarations) check(v, `#${v.id.type === 'Identifier' ? v.id.name : '(pattern)'}`);
        } else if (d.id) check(d, `#${d.id.name}`);
      },
    };
  },
};
