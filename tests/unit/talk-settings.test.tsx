// Settings > Talk (mw-06ggew.8): Talk Hold | Tap and Send On release | By button, kept on the device (the settings store), Hold and On release until he
// chooses, and read live by every talk bar through useTalkSettings (src/talkSettings.ts).
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { DEFINITIONS, sendSetting, talkSetting } from '../../src/settings/definitions';
import { SETTINGS } from '../../src/settings/registry';
import { ROWS, SECTIONS, groupOf } from '../../src/settings/rows';
import { getSetting, setSetting } from '../../src/settings/store';
import { useTalkHold } from '../../src/talk/useTalkHold';
import { LAMPAS_TALK_SETTINGS, tapWord, useTalkSettings } from '../../src/talkSettings';

afterAll(() => {
  cleanup();
  db.close();
});

beforeEach(async () => {
  cleanup();
  clearBus();
  await db.open();
  await db.settings.clear();
});

function Probe() {
  const { talk, send } = useTalkSettings();
  return <p data-testid="probe">{`${talk} ${send}`}</p>;
}

describe('the Talk settings', () => {
  it('are Hold and On release until he chooses, the settings every bar had before', async () => {
    expect(await getSetting(talkSetting)).toBe('hold');
    expect(await getSetting(sendSetting)).toBe('release');
    expect(LAMPAS_TALK_SETTINGS).toEqual({ talk: 'hold', send: 'release' });
  });

  it('are kept on the device: what is saved is read back, and a value they do not allow is the default', async () => {
    await setSetting(talkSetting, 'tap');
    await setSetting(sendSetting, 'button');
    expect(await db.settings.get('talk')).toEqual({ key: 'talk', value: 'tap' });
    expect(await db.settings.get('send')).toEqual({ key: 'send', value: 'button' });
    expect(await getSetting(talkSetting)).toBe('tap');
    expect(await getSetting(sendSetting)).toBe('button');
    await db.settings.bulkPut([
      { key: 'talk', value: 'off' },
      { key: 'send', value: 'never' },
    ]);
    expect(await getSetting(talkSetting)).toBe('hold');
    expect(await getSetting(sendSetting)).toBe('release');
  });

  it('are two rows of a section Talk, labelled Talk (Hold | Tap) and Send (On release | By button)', () => {
    expect(SECTIONS.find((s) => s.id === 'talk')?.title).toBe('Talk');
    const rows = ROWS.filter((r) => r.section === 'talk');
    expect(rows.map((r) => r.label)).toEqual(['Talk', 'Send']);
    expect(talkSetting.allowed).toMatchObject({ kind: 'choice', values: [{ value: 'hold', label: 'Hold' }, { value: 'tap', label: 'Tap' }] });
    expect(sendSetting.allowed).toMatchObject({ kind: 'choice', values: [{ value: 'release', label: 'On release' }, { value: 'button', label: 'By button' }] });
    expect(groupOf('talk').id).toBe('tutor');
    expect(DEFINITIONS).toContain(talkSetting);
    expect(SETTINGS.find((s) => s.key === 'send')).toBeDefined();
  });

  it('are read live by useTalkSettings: Hold and On release at first, then what he saves', async () => {
    render(<Probe />);
    expect((await screen.findByTestId('probe')).textContent).toBe('hold release');
    await act(async () => {
      await setSetting(talkSetting, 'tap');
      await setSetting(sendSetting, 'button');
    });
    await screen.findByText('tap button');
    await act(async () => {
      await setSetting(talkSetting, 'hold');
    });
    await screen.findByText('hold button');
  });
});

function HoldProbe({ delay }: { delay?: number }) {
  const hold = useTalkHold(() => undefined, { holdDelayMs: delay });
  return <p data-testid="hold">{hold.talk}</p>;
}

describe('a talk bar that is also tapped', () => {
  it('stays a hold while Talk is Tap, because its tap already means something else', async () => {
    await setSetting(talkSetting, 'tap');
    render(
      <>
        <HoldProbe />
        <HoldProbe delay={500} />
      </>,
    );
    await screen.findAllByText('tap');
    const talks = screen.getAllByTestId('hold').map((p) => p.textContent);
    expect(talks).toEqual(['tap', 'hold']);
  });
});

describe('tapWord', () => {
  it('turns the Hold of a bar label into Tap only while Talk is Tap', () => {
    expect(tapWord('Hold to ask', 'tap')).toBe('Tap to ask');
    expect(tapWord('Hold and say it', 'tap')).toBe('Tap and say it');
    expect(tapWord('Hold to ask', 'hold')).toBe('Hold to ask');
    expect(tapWord('Talk', 'tap')).toBe('Talk');
    expect(tapWord('Release to send', 'tap')).toBe('Release to send');
  });
});
