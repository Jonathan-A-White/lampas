// An optional answer array that the instructions say to "leave out" must have only one way to say nothing (mw-5r3p30.691):
// the mill's smoke check counts a present empty array as present, and the app has nothing to do with one.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { validate, type Schema } from '../support/schema-validate';
import '../support/grinds-in-graph';

const read = (file: string): Schema => JSON.parse(readFileSync(`grinds/${file}`, 'utf8')) as Schema;
const files = readdirSync('grinds').filter((file) => file.endsWith('.answer.schema.json'));

describe('the answer schemas of the grinds', () => {
  it('refuse an empty array for every optional array whose description says to leave it out', () => {
    const loose: string[] = [];
    for (const file of files) {
      const schema = read(file);
      const required = new Set((schema as { required?: string[] }).required ?? []);
      for (const [name, prop] of Object.entries(schema.properties ?? {})) {
        const p = prop as Schema & { description?: string };
        if (p.type !== 'array' || required.has(name)) continue;
        if (/leave it out|leave both out|leave out/i.test(p.description ?? '') && !((p.minItems ?? 0) >= 1)) loose.push(`${file}: ${name}`);
      }
    }
    expect(loose).toEqual([]);
  });

  describe('bible-talk profile_update', () => {
    const schema = read('bible-talk.answer.schema.json');
    const answer = { answer: 'Fine.', question: 'What does it say?', words: [] };

    it('has minItems 1', () => {
      expect(schema.properties?.profile_update?.minItems).toBe(1);
    });

    it('refuses [] and takes it left out, or with one to three entries', () => {
      expect(validate({ ...answer, profile_update: [] }, schema)).not.toEqual([]);
      for (const value of [answer, { ...answer, profile_update: [{ field: 'pace', value: 'slow' }] }]) {
        expect(validate(value, schema), JSON.stringify(value)).toEqual([]);
      }
    });
  });
});
