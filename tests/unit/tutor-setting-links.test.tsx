// The tutor can link a setting (mw-5r3p30.502): a link {kind:'setting', key} in a Bible talk answer is drawn as a chip that opens Settings at that row.
// The schema (made from the registry by npm run grind:build), the guard, the chip and the grind instructions agree.
import '@testing-library/react/dont-cleanup-after-each';
import { readFileSync } from 'node:fs';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnswerLink } from '../../src/data/db';
import { db } from '../../src/data/db';
import { MAX_LINKS, isTalkAnswer } from '../../src/services/talk';
import { SETTINGS } from '../../src/settings/registry';
import { TutorLinks } from '../../src/TutorLinks';
import { instructionsOf } from '../../scripts/grind-parts';
import { validate, type Schema } from '../support/schema-validate';
import '../support/grinds-in-graph';

const schema = JSON.parse(readFileSync('grinds/bible-talk.answer.schema.json', 'utf8')) as Schema;
const base = { answer: 'Make the text bigger in Settings.', question: 'What does it say?', words: [] };
const text: AnswerLink = { kind: 'setting', key: 'textSize' };

afterAll(() => {
  cleanup();
  db.close();
});

beforeEach(async () => {
  await db.open();
  await db.settings.clear();
  window.location.hash = '#/';
});

describe('a setting link in the schema and the guard', () => {
  it('is accepted for every key of the registry, and refused for an invented key, by the schema and not by the guard', () => {
    for (const s of SETTINGS) {
      const value = { ...base, links: [{ kind: 'setting', key: s.key }] };
      expect(validate(value, schema), s.key).toEqual([]);
      expect(isTalkAnswer(value), s.key).toBe(true);
    }
    const invented = { ...base, links: [{ kind: 'setting', key: 'noSuchSetting' }] };
    expect(validate(invented, schema)).not.toEqual([]);
    // the phone draws nothing for it but does not lose the answer
    expect(isTalkAnswer(invented)).toBe(true);
  });

  it('refuses a setting link that has a lemma, no key, an empty key or an extra key', () => {
    for (const link of [{ kind: 'setting' }, { kind: 'setting', key: '' }, { kind: 'setting', key: 'textSize', lemma: 'ἀγάπη' }, { kind: 'setting', lemma: 'x' }]) {
      expect(isTalkAnswer({ ...base, links: [link] }), JSON.stringify(link)).toBe(false);
    }
  });

  it('keeps the limit of three links', () => {
    const links = [text, text, text, text];
    expect(validate({ ...base, links }, schema)).not.toEqual([]);
    expect(validate({ ...base, links: links.slice(0, MAX_LINKS) }, schema)).toEqual([]);
  });
});

describe('the chip', () => {
  it('opens that setting\'s link, after leaving the sheet', async () => {
    cleanup();
    const onLeave = vi.fn();
    render(<TutorLinks links={[text]} onLeave={onLeave} />);
    const chip = await screen.findByRole('button', { name: 'Open Text size in Settings' });
    await userEvent.click(chip);
    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe('#/settings?setting=textSize');
    cleanup();
  });

  it('draws no chip and no empty group for a key the registry lacks, and nothing at all when that is the only link', async () => {
    cleanup();
    const { container } = render(<TutorLinks links={[{ kind: 'setting', key: 'noSuchSetting' }]} onLeave={() => {}} />);
    await waitFor(() => expect(db.settings.count()).resolves.toBe(0));
    await new Promise((r) => setTimeout(r, 50));
    expect(container.querySelector('[data-tutor-links]')).toBeNull();
    expect(screen.queryByRole('group')).toBeNull();
    cleanup();
    render(<TutorLinks links={[{ kind: 'setting', key: 'noSuchSetting' }, text]} onLeave={() => {}} />);
    await screen.findByRole('button', { name: 'Open Text size in Settings' });
    expect(screen.getAllByRole('group')).toHaveLength(1);
    cleanup();
  });

  it('counts a setting link in the limit of three', async () => {
    cleanup();
    const keys = ['textSize', 'theme', 'layout', 'weave'];
    render(<TutorLinks links={keys.map((key) => ({ kind: 'setting' as const, key }))} onLeave={() => {}} />);
    await screen.findByRole('button', { name: 'Open Text size in Settings' });
    expect(screen.getAllByRole('group')).toHaveLength(MAX_LINKS);
    expect(screen.queryByRole('button', { name: 'Open Weave in Settings' })).toBeNull();
    cleanup();
  });
});

describe('the grind instructions on setting links', () => {
  it('say what a setting link is, name the keys it may take, and keep the limit', () => {
    const instructions = instructionsOf('bible-talk');
    expect(instructions).toContain('`kind` `setting`');
    expect(instructions).toMatch(/`key`/);
    for (const s of SETTINGS) expect(instructions, s.key).toContain(`\`${s.key}\``);
    expect(instructions).toMatch(/never invent a key/i);
  });
});
