// no-raw-interest-write: an e2e or a feature step does not write the Greek or Hebrew dial straight into the settings store (mw-fnvjof.17.74).
// A bare level skips what tapping its step also sets (the Weave Solid at 2, the Greek view at 4: BRINGS in src/data/repositories/greekInterest.ts), so the screen the test draws is not the one he
// sees. tests/e2e/greek-start.ts putAtLevels / rowsAtLevels write the level and what it brings. It refuses the name 'greekInterest' or 'hebrewInterest' as the key of a row ({ key: 'greekInterest', ... }),
// as a property of an object ({ greekInterest: '5' }) or as an argument of a call that writes (put, bulkPut, keep, set...), unless the line or the line above says why:
// '// a raw level: <reason>'. A read (db.settings.get('hebrewInterest')) and the localStorage start key are not writes.

const NAMES = new Set(['greekInterest', 'hebrewInterest']);
const MARK = /\/\/ a raw level:\s*\S/;
const WRITERS = /^(put|bulkPut|add|set\w*|keep|write\w*|seed\w*|save\w*)$/i;

const MESSAGE =
  'A bare greekInterest/hebrewInterest write skips what tapping the step also sets (the Weave Solid at 2, the Greek view at 4), so the test draws a screen he never sees. ' +
  "Use putAtLevels or rowsAtLevels from tests/e2e/greek-start.ts, or mark the line '// a raw level: <reason>'.";

const calleeName = (callee) => {
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier') return callee.property.name;
  return null;
};

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Refuse a raw greekInterest or hebrewInterest write in an e2e or a feature step' },
    schema: [],
    messages: { raw: MESSAGE },
  },
  create(context) {
    const source = context.sourceCode;
    const report = (node) => {
      const line = node.loc.start.line;
      if ([line, line - 1].some((n) => n >= 1 && MARK.test(source.lines[n - 1] ?? ''))) return;
      context.report({ node, messageId: 'raw' });
    };
    return {
      // { key: 'greekInterest', ... } and { greekInterest: '5' }
      Property(node) {
        if (node.computed) return;
        const k = node.key;
        const keyName = k.type === 'Identifier' ? k.name : k.type === 'Literal' ? k.value : null;
        if (typeof keyName === 'string' && NAMES.has(keyName)) return report(node);
        if (keyName === 'key' && node.value.type === 'Literal' && NAMES.has(node.value.value)) report(node.value);
      },
      // keep(page, 'greekInterest', '2'), store.put('greekInterest', ...)
      CallExpression(node) {
        const name = calleeName(node.callee);
        if (!name || !WRITERS.test(name)) return;
        for (const arg of node.arguments) if (arg.type === 'Literal' && NAMES.has(arg.value)) report(arg);
      },
    };
  },
};
