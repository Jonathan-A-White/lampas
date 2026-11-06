// scripts/sermons/toml.ts — the subset of TOML the sermon-index repo's source.toml uses (docs/sources.md there): `key = value` lines with a basic string, a multi-line basic string
// ("""...""", a backslash at the end of a line joins the next, as TOML says), a multi-line literal string (''' ... ''', kept as it stands), a boolean, a whole number or a date (kept as its text), and `#` comments. Anything else is an error that names
// the line, so a source.toml that grows a table or an array is noticed here rather than read wrong.
export type TomlValue = string | boolean | number;

const ESCAPES: Record<string, string> = { b: '\b', t: '\t', n: '\n', f: '\f', r: '\r', '"': '"', '\\': '\\' };

/** Reads one escape sequence at text[i] (just after a backslash); returns what it means and where the text goes on. */
function escape(text: string, i: number, where: string): [string, number] {
  const c = text[i];
  if (c in ESCAPES) return [ESCAPES[c], i + 1];
  if (c === 'u' || c === 'U') {
    const n = c === 'u' ? 4 : 8;
    const hex = text.slice(i + 1, i + 1 + n);
    if (hex.length === n && /^[0-9a-fA-F]+$/.test(hex)) return [String.fromCodePoint(parseInt(hex, 16)), i + 1 + n];
  }
  throw new Error(`${where}: unknown escape \\${c ?? ''}`);
}

export function parseToml(text: string): Record<string, TomlValue> {
  const out: Record<string, TomlValue> = {};
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n];
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const eq = /^([A-Za-z0-9_-]+)\s*=\s*(.*)$/.exec(line);
    if (!eq) throw new Error(`line ${n + 1}: not a key = value line`);
    const [, key, rest] = eq;
    const where = `${key} (line ${n + 1})`;
    if (key in out) throw new Error(`${where}: given twice`);
    if (rest.startsWith("'''")) {
      // a multi-line literal string: the text to the next ''' as it stands (no escapes, the line breaks kept); a newline right after the opening is dropped
      let raw = rest.slice(3);
      while (!raw.includes("'''")) {
        if (n + 1 >= lines.length) throw new Error(`${where}: the multi-line string is never closed`);
        raw += `\n${lines[++n]}`;
      }
      const close = raw.indexOf("'''");
      if (raw.slice(close + 3).trim() !== '' && !raw.slice(close + 3).trim().startsWith('#')) throw new Error(`${where}: something after the string`);
      out[key] = raw.slice(0, close).replace(/^\n/, '');
      continue;
    }
    if (rest.startsWith('"""')) {
      // the raw text runs to the next """; a newline right after the opening is dropped
      let raw = rest.slice(3);
      while (!raw.includes('"""')) {
        if (n + 1 >= lines.length) throw new Error(`${where}: the multi-line string is never closed`);
        raw += `\n${lines[++n]}`;
      }
      const close = raw.indexOf('"""');
      if (raw.slice(close + 3).trim() !== '' && !raw.slice(close + 3).trim().startsWith('#')) throw new Error(`${where}: something after the string`);
      raw = raw.slice(0, close).replace(/^\n/, '');
      let value = '';
      for (let i = 0; i < raw.length; ) {
        if (raw[i] !== '\\') {
          value += raw[i++];
          continue;
        }
        const joined = /^\\[ \t]*\n\s*/.exec(raw.slice(i));
        if (joined) {
          i += joined[0].length;
          continue;
        }
        const [ch, next] = escape(raw, i + 1, where);
        value += ch;
        i = next;
      }
      out[key] = value;
      continue;
    }
    if (rest.startsWith('"')) {
      let i = 1;
      let value = '';
      for (;;) {
        if (i >= rest.length) throw new Error(`${where}: the string is never closed`);
        const c = rest[i];
        if (c === '"') break;
        if (c === '\\') {
          const [ch, next] = escape(rest, i + 1, where);
          value += ch;
          i = next;
        } else {
          value += c;
          i++;
        }
      }
      const after = rest.slice(i + 1).trim();
      if (after !== '' && !after.startsWith('#')) throw new Error(`${where}: something after the string`);
      out[key] = value;
      continue;
    }
    const bare = rest.replace(/\s+#.*$/, '').trim();
    if (bare === 'true' || bare === 'false') out[key] = bare === 'true';
    else if (/^\d{4}-\d{2}-\d{2}$/.test(bare)) out[key] = bare;
    else if (/^-?\d+$/.test(bare)) out[key] = Number(bare);
    else throw new Error(`${where}: a value this reader does not know: ${bare}`);
  }
  return out;
}
