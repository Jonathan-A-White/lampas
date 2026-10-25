// The ask-for-approach and ask-for-more commands (src/services/formCommands.ts, mw-o7cts8.3): the one path a form's own Send and the tutor's Send both run.
// Each posts through submitFeedback with the body the builders give; a value over its limit is refused before anything is posted.
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/feedback', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/services/feedback')>()),
  submitFeedback: vi.fn(async () => undefined),
}));

import { argsOf } from '../../src/formHelper/formHelper';
import { MORE_FORMS } from '../../src/formHelper/moreForms';
import { APPROACH_FORM } from '../../src/formHelper/approachForm';
import { db } from '../../src/data/db';
import { createVerseList, getVerseList, listVerseLists } from '../../src/data/repositories';
import { LIST_NAME_MAX } from '../../src/share/listName';
import { askForApproachCommand, askForMoreCommand, approachCommand, saveAsListCommand } from '../../src/services/formCommands';
import {
  buildFeedbackRequest,
  buildMoreRequest,
  MAX_CREDIT_NAME,
  MAX_CREDIT_URL,
  MAX_FEEDBACK_CHARS,
  MAX_MORE_NAME,
  MORE_KINDS,
  submitFeedback,
} from '../../src/services/feedback';

const posted = vi.mocked(submitFeedback);

beforeEach(() => posted.mockClear());

describe('the ask-for-approach command', () => {
  it('is a confirm command for the tutor and requires the approach and the credit, bounds each and the link, and has no pictures property', () => {
    expect(askForApproachCommand.name).toBe('ask-for-approach');
    expect(askForApproachCommand.kind).toBe('confirm');
    const args = askForApproachCommand.args!;
    expect(args.required).toEqual(['approach', 'credit']);
    expect(args.additionalProperties).toBe(false);
    expect(args.properties?.approach).toMatchObject({
      type: 'string',
      maxLength: MAX_FEEDBACK_CHARS,
    });
    expect(args.properties?.credit).toMatchObject({
      type: 'string',
      maxLength: MAX_CREDIT_NAME,
    });
    expect(args.properties?.link).toMatchObject({
      type: 'string',
      maxLength: MAX_CREDIT_URL,
    });
    expect(args.properties).not.toHaveProperty('pictures');
    expect(askForApproachCommand.offer?.({ approach: 'Colours', credit: 'Anna Example' })).toBe('Send this approach, credit Anna Example?');
  });

  it('posts one grammar-approach request with the body buildFeedbackRequest gives', async () => {
    const result = await askForApproachCommand.run({
      approach: 'Teach the cases with colours.',
      credit: 'Anna Example',
      link: 'example.org/greek',
    });
    expect(posted).toHaveBeenCalledTimes(1);
    expect(posted.mock.calls[0][0]).toEqual(buildFeedbackRequest('Teach the cases with colours.', 'Anna Example', 'example.org/greek'));
    expect(posted.mock.calls[0][0]).toMatchObject({
      kind: 'grammar-approach',
      credit: { name: 'Anna Example', url: 'https://example.org/greek' },
    });
    expect(result.said).not.toBe('');
  });

  it('posts the pictures its sheet holds, and leaves the link out when there is none', async () => {
    const files = [
      {
        bytes: new Uint8Array([1, 2]),
        mime: 'image/jpeg',
        name: 'picture-1.jpg',
      },
    ];
    const signal = new AbortController().signal;
    await approachCommand({
      pictures: async () => files,
      signal: () => signal,
    }).run({ approach: 'A', credit: 'B' });
    expect(posted.mock.calls[0][0]).toEqual(buildFeedbackRequest('A', 'B'));
    expect(posted.mock.calls[0][1]).toEqual({ files, signal });
  });

  it('tells its sheet when the grist is out, and refuses an over-long approach before anything is posted', async () => {
    const sent = vi.fn();
    await approachCommand({ onSent: sent }).run({ approach: 'A', credit: 'B' });
    expect(sent).toHaveBeenCalledTimes(1);
    await expect(
      askForApproachCommand.run({
        approach: 'x'.repeat(MAX_FEEDBACK_CHARS + 1),
        credit: 'B',
      }),
    ).rejects.toThrow(/at most/i);
    expect(posted).toHaveBeenCalledTimes(1);
  });
});

describe('the ask-for-more command', () => {
  it('is one name for the three forms: it requires the name and the kind, the kind one of MORE_KINDS', () => {
    const command = askForMoreCommand('text');
    expect(command.name).toBe('ask-for-more');
    expect(command.kind).toBe('confirm');
    const args = command.args!;
    expect(args.required).toEqual(expect.arrayContaining(['name', 'kind']));
    expect(args.required).not.toContain('why');
    expect(args.additionalProperties).toBe(false);
    expect(args.properties?.kind).toMatchObject({
      type: 'string',
      enum: [...MORE_KINDS],
    });
    expect(args.properties?.name).toMatchObject({
      type: 'string',
      maxLength: MAX_MORE_NAME,
    });
    expect(args.properties?.why).toMatchObject({
      type: 'string',
      maxLength: MAX_FEEDBACK_CHARS,
    });
    expect(args.properties?.link).toMatchObject({
      type: 'string',
      maxLength: MAX_CREDIT_URL,
    });
    for (const kind of MORE_KINDS) expect(askForMoreCommand(kind).name).toBe('ask-for-more');
    expect(command.offer?.({ kind: 'text', name: 'The Septuagint' })).toBe('Send A text: The Septuagint?');
  });

  it('posts buildMoreRequest of the args, for each kind', async () => {
    for (const kind of MORE_KINDS) {
      posted.mockClear();
      await askForMoreCommand(kind).run({
        kind,
        name: 'The Septuagint',
        why: 'To read it in Greek.',
        link: 'example.org/lxx',
      });
      expect(posted).toHaveBeenCalledTimes(1);
      expect(posted.mock.calls[0][0]).toEqual(buildMoreRequest(kind, 'The Septuagint', 'To read it in Greek.', 'example.org/lxx'));
    }
  });

  it('sends the name alone, and his memorizing evidence only when the form hands it over', async () => {
    await askForMoreCommand('translation').run({
      kind: 'translation',
      name: 'The NASB',
    });
    expect(posted.mock.calls[0][0]).toEqual(buildMoreRequest('translation', 'The NASB'));
    const evidence = { summary: '1 verse, 3 recalls', evidence: [] };
    await askForMoreCommand('translation', {
      memorizing: async () => evidence,
    }).run({ kind: 'translation', name: 'The NASB' });
    expect(posted.mock.calls[1][0]).toEqual(buildMoreRequest('translation', 'The NASB', '', '', evidence));
  });

  it('refuses an over-long name before anything is posted', async () => {
    await expect(
      askForMoreCommand('text').run({
        kind: 'text',
        name: 'x'.repeat(MAX_MORE_NAME + 1),
      }),
    ).rejects.toThrow(/at most/i);
    expect(posted).not.toHaveBeenCalled();
  });

  it('has a form per kind whose fields are name, why and link, titled as the page lists them', () => {
    expect(MORE_FORMS.text.name).toBe('A text');
    expect(MORE_FORMS.approach.name).toBe('An approach or programme');
    expect(MORE_FORMS.translation.name).toBe('A translation');
    for (const kind of MORE_KINDS) {
      const [name, why, link] = MORE_FORMS[kind].fields;
      expect([name.name, name.kind, name.required, name.maxLength]).toEqual(['name', 'text', true, MAX_MORE_NAME]);
      expect([why.name, why.kind, why.required, why.maxLength]).toEqual(['why', 'text', false, MAX_FEEDBACK_CHARS]);
      expect([link.name, link.kind, link.required, link.maxLength, link.label]).toEqual(['link', 'link', false, MAX_CREDIT_URL, 'Link']);
    }
    expect(MORE_FORMS.text.fields[0].label).toBe('Which text?');
  });
});

describe('what the form’s own Send passes', () => {
  it('is argsOf the form: trimmed, an empty field left out, pictures never', () => {
    expect(
      argsOf(APPROACH_FORM, {
        approach: ' A ',
        pictures: '2 pictures added',
        credit: 'B',
        link: ' ',
      }),
    ).toEqual({ approach: 'A', credit: 'B' });
    expect(argsOf(MORE_FORMS.text, { name: ' The LXX ', why: '', link: 'x.org' })).toEqual({ name: 'The LXX', link: 'x.org' });
  });
});

describe('the save-as-list command', () => {
  const REFS = ['Rom.8.28', 'Gen.1.1', 'John.3.16-17'];
  const namesOf = async () => (await listVerseLists()).map((l) => l.name);

  beforeEach(async () => {
    await db.open();
    await db.verseLists.clear();
  });

  it('is a confirm command that requires where and name, where one of New list and the lists he has', async () => {
    await createVerseList('Peace', [], 1);
    await createVerseList('Refuge', [], 2);
    const command = saveAsListCommand(REFS, await namesOf());
    expect(command.name).toBe('save-as-list');
    expect(command.kind).toBe('confirm');
    const args = command.args!;
    expect(args.required).toEqual(['where', 'name']);
    expect(args.additionalProperties).toBe(false);
    expect(args.properties?.where).toMatchObject({ type: 'string', enum: ['New list', 'Refuge', 'Peace'] });
    expect(args.properties?.name).toMatchObject({ type: 'string', maxLength: LIST_NAME_MAX });
  });

  it('with New list makes a list with the references and says how many it saved', async () => {
    const saved = vi.fn();
    const result = await saveAsListCommand(REFS, [], { onSaved: saved }).run({ where: 'New list', name: 'Refuge' });
    expect(result.said).toBe('Saved 3 references to Refuge');
    const [list] = await listVerseLists();
    expect(list).toMatchObject({ name: 'Refuge', refs: REFS });
    expect(saved).toHaveBeenCalledWith({ id: list.id, line: 'Saved 3 references to Refuge' });
  });

  it('with a list he has adds only the references it does not hold, and keeps the list its own name', async () => {
    const peace = await createVerseList('Peace', ['John.3.16-17', 'Ps.23'], 1);
    const result = await saveAsListCommand(REFS, ['Peace']).run({ where: 'Peace', name: 'Ignored' });
    expect(result.said).toBe('Saved 2 references to Peace');
    expect((await getVerseList(peace.id))?.refs).toEqual(['John.3.16-17', 'Ps.23', 'Rom.8.28', 'Gen.1.1']);
    expect(await namesOf()).toEqual(['Peace']);
  });

  it('says so, and changes nothing, when the list held every reference', async () => {
    const all = await createVerseList('All', REFS, 1);
    const result = await saveAsListCommand(REFS, ['All']).run({ where: 'All', name: 'x' });
    expect(result.said).toBe('All 3 references were already in All');
    expect((await getVerseList(all.id))?.refs).toEqual(REFS);
  });

  it('refuses a where that is not among the lists, and a name over its limit, before anything is written', async () => {
    await createVerseList('Peace', [], 1);
    await expect(saveAsListCommand(REFS, ['Peace']).run({ where: 'Nowhere', name: 'A' })).rejects.toThrow(/not saved/i);
    await expect(saveAsListCommand(REFS, ['Peace']).run({ where: 'New list', name: 'x'.repeat(LIST_NAME_MAX + 1) })).rejects.toThrow(/at most/i);
    await expect(saveAsListCommand(REFS, ['Peace']).run({ where: 'New list' })).rejects.toThrow(/not saved/i);
    expect(await namesOf()).toEqual(['Peace']);
    expect((await listVerseLists())[0].refs).toEqual([]);
  });

  it('refuses a list that went away since the sheet opened, writing nothing', async () => {
    const gone = await createVerseList('Gone', [], 1);
    const command = saveAsListCommand(REFS, ['Gone']);
    await db.verseLists.delete(gone.id);
    await expect(command.run({ where: 'Gone', name: 'A' })).rejects.toThrow(/not there any more/i);
    expect(await namesOf()).toEqual([]);
  });
});
