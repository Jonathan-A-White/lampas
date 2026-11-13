// layers: the one place Lampas's layers are written as code (mw-6ww.175.12; docs/module-map.md section 4 says why).
// A file may import only from its own layer or one below it. Low to high:
//   data      src/data/**, src/config.ts        the text and everything computed from it; knows no screen, no setting, no voice
//   shared    src/ui/**, src/services/**        shared controls, and what leaves the phone; knows no feature
//   features  everything else under src/        screens, the Reader, Talk, settings, speech...
// Today's breaks of this are listed once in layer-inversions.json; the rule refuses any other, and tests/unit/layers.test.ts
// fails when the list grows past INVERSIONS_RECORDED or holds a line that is no longer a break (delete that line and lower the count).
import fs from 'node:fs';
import path from 'node:path';

export const LAYERS = ['data', 'shared', 'features'];

/** The number of allowed inversions this story recorded. It only goes down: lower it when you delete a line of layer-inversions.json. */
export const INVERSIONS_RECORDED = 183;

/** The layer of a repo-relative path under src/ (forward slashes), or null for a file outside src/. */
export const layerOf = (rel) => {
  if (!rel.startsWith('src/')) return null;
  if (rel.startsWith('src/data/') || rel === 'src/config.ts') return 'data';
  if (rel.startsWith('src/ui/') || rel.startsWith('src/services/')) return 'shared';
  return 'features';
};

export const rankOf = (layer) => LAYERS.indexOf(layer);

const EXTENSIONS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

/** The repo-relative file a relative import specifier names, or null (a package, or a file that is not there). */
export const resolveImport = (root, fromRel, spec) => {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(root, path.dirname(fromRel), spec);
  for (const ext of EXTENSIONS) {
    const file = base + ext;
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return path.relative(root, file).split(path.sep).join('/');
  }
  return null;
};

/** 'from -> to' when `from` importing `to` is an inversion (a lower layer reaching a higher one), else null. */
export const inversionKey = (fromRel, toRel) => {
  const a = layerOf(fromRel);
  const b = layerOf(toRel);
  if (a === null || b === null) return null;
  return rankOf(a) < rankOf(b) ? `${fromRel} -> ${toRel}` : null;
};
