// The tutor knows which study resources he has on (mw-5r3p30.123): the request lists only those switched on in Settings, and the grind's instructions say
// to link a resource only when it truly helps, in the structured `links`, never a web address of the model's own.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { StudyResources } from '../../src/data/repositories';
import { isKnownLink, isResourceLink, RESOURCE_HOSTS } from '../../src/resources/hosts';
import { RESOURCES } from '../../src/resources';
import { resourcesForTutor } from '../../src/resources/tutorLinks';
import { buildTalkRequest } from '../../src/services/talk';
import type { Schema } from '../support/schema-validate';

const on = (...ids: string[]): StudyResources => ({ on: ids, options: {} });
const chapter = { verses: [] } as never;
const instructions = readFileSync('grinds/bible-talk.instructions.md', 'utf8');
const verseAsk = readFileSync('grinds/verse-ask.instructions.md', 'utf8');
const input = JSON.parse(readFileSync('grinds/bible-talk.input.schema.json', 'utf8')) as Schema;

describe('resourcesForTutor', () => {
  it('lists only the resources that are on, in the order Settings lists them, with what each can link', () => {
    expect(resourcesForTutor(on('accordance', 'logos'))).toEqual([
      { id: 'logos', name: 'Logos', words: true, verses: true },
      { id: 'accordance', name: 'Accordance', words: true, verses: false },
    ]);
    expect(resourcesForTutor(on('strongs'))).toEqual([{ id: 'strongs', name: "Strong's", words: true, verses: false }]);
  });

  it('is empty when none is on', () => {
    expect(resourcesForTutor(on())).toEqual([]);
  });
});

describe('the request', () => {
  const scope = { title: 'Romans 8', chapter, verse: null };
  const send = (resources?: ReturnType<typeof resourcesForTutor>) =>
    buildTalkRequest(scope, 'Why?', [], [], {}, undefined, undefined, undefined, [], resources);

  it('carries the resources he has on, and an empty list when none is', () => {
    expect(send(resourcesForTutor(on('logos'))).resources).toEqual([{ id: 'logos', name: 'Logos', words: true, verses: true }]);
    expect(send().resources).toEqual([]);
  });

  it('has the field in the input schema as an optional list', () => {
    expect(input.properties?.resources).toBeDefined();
    expect(input.required as string[]).not.toContain('resources');
  });
});

describe('the bible-talk instructions on resources', () => {
  it('name the `resources` field as the ones he has on, and say to link only when it truly helps, never as decoration', () => {
    expect(instructions).toContain('`resources`');
    expect(instructions).toMatch(/Link\s+only\s+what\s+those\s+can\s+open/i);
    expect(instructions).toMatch(/only\s+when\s+it\s+truly\s+helps/i);
    expect(instructions).toMatch(/never\s+link\s+a\s+resource\s+as\s+decoration/i);
  });

  it('say to link in `links`, never to write a web address', () => {
    expect(instructions).toMatch(/never\s+write\s+a\s+web\s+address/i);
  });
});

describe('the instructions on other passages', () => {
  it.each([
    ['bible-talk', instructions],
    ['verse-ask', verseAsk],
  ])('of %s say to answer a question about another passage in place, name the verse, and never send him to ask elsewhere', (_, text) => {
    expect(text).toContain('## Other passages');
    expect(text).toMatch(/answer it\s+(fully\s+)?(here|in place)/i);
    expect(text).toMatch(/book\s+name,\s+chapter\s+and\s+verse/i);
    expect(text).toMatch(/never\s+tell\s+him\s+to\s+go\s+and\s+ask\s+it\s+elsewhere/i);
  });
});

describe('the hosts a link in an answer may point at', () => {
  it('include the hosts the resources build their https links on (the links and their fallbacks)', () => {
    const hosts = new Set<string>();
    const word = { form: 'ἀγάπη', lemma: 'ἀγάπη', strongs: 'G26', topic: 'love', ref: { book: 'rom', chapter: 8, verse: 28 } };
    for (const r of RESOURCES) {
      const links = [...r.linksFor(word, r.choices ? r.choices.items.map((i) => i.id).join(',') : r.option?.default), ...(r.versesFor?.({ book: 'rom', chapter: 8, verse: 28 }, 'LLS:LGCYSTNDRDBBLSB') ?? [])];
      for (const l of links) for (const url of [l.url, l.fallback]) if (url?.startsWith('https:')) hosts.add(new URL(url).host);
    }
    for (const host of hosts) expect(RESOURCE_HOSTS, host).toContain(host);
  });

  it('accept an https address on one of them and nothing else', () => {
    expect(isResourceLink('https://ref.ly/logosres/bdag')).toBe(true);
    expect(isResourceLink('http://ref.ly/logosres/bdag')).toBe(false);
    expect(isResourceLink('https://evil.example/x')).toBe(false);
    expect(isResourceLink('https://ref.ly.evil.example/x')).toBe(false);
    expect(isResourceLink('logosres:LLS:46.30.18;hw=x')).toBe(false);
    expect(isResourceLink('javascript:alert(1)')).toBe(false);
    expect(isResourceLink('not a link')).toBe(false);
  });

  it('also accept a credit\'s own address on About, and a page under it, and not the rest of its host', () => {
    expect(isKnownLink('https://github.com/Jonathan-A-White/bsv-kit')).toBe(true);
    expect(isKnownLink('https://github.com/Jonathan-A-White/bsv-kit/blob/main/LICENSE')).toBe(true);
    expect(isKnownLink('https://dexie.org/')).toBe(true);
    expect(isKnownLink('https://github.com/evil/repo')).toBe(false);
    expect(isKnownLink('https://github.com/Jonathan-A-White/bsv-kit-evil')).toBe(false);
  });
});
