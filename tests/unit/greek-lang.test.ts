// A Greek span is read by a Greek voice under TalkBack (mw-cwf538.3): Android's text to speech has 'el' and no 'grc', so a span is lang="el" with data-lang="grc"
// (src/script/greekLang.ts). No screen writes lang="grc" itself, or the phone reads the Greek in its own language.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GREEK_LANG, greekLang, langOf } from '../../src/script/greekLang';

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? sources(join(dir, e.name)) : /\.tsx$/.test(e.name) ? [join(dir, e.name)] : []));
}

describe('the language of a Greek span', () => {
  it('is el, with the ancient-Greek meaning in data-lang', () => {
    expect(GREEK_LANG).toEqual({ lang: 'el', 'data-lang': 'grc' });
    expect(greekLang(true)).toEqual(GREEK_LANG);
    expect(greekLang(false)).toEqual({});
    expect(langOf(true)).toEqual(GREEK_LANG);
    expect(langOf(false)).toEqual({ lang: 'en' });
  });

  it('is written by no screen as lang grc', () => {
    const wrong = sources('src').flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .flatMap((line, i) => (/lang=(["']grc["']|\{[^}]*['"]grc['"])/.test(line) ? [`${file}:${i + 1}: ${line.trim()}`] : [])),
    );
    expect(wrong).toEqual([]);
  });
});
