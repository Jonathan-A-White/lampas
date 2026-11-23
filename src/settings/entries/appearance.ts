// src/settings/entries/appearance.ts — the registry entries of Text size, Layout and Section headings, written by hand (SETTINGS slots 80 to 100, src/settings/entry.ts).
import { TEXT_SIZES } from '../../appearance/textSizes';
import { getLayout, getSectionHeadings, getTextSize, setLayout, setSectionHeadings, setTextSize, type ReadingLayout, type SectionHeadings } from '../../data/repositories';
import { publish } from '../../events/bus';
import { LAYOUTS } from '../../layout/layouts';
import type { SettingValue } from '../define';
import { choice, slotted } from '../entry';

const ON_OFF = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];

const textSizeId = (percent: number): SettingValue => TEXT_SIZES.find((t) => t.percent === percent)?.id ?? percent;

export const textSizeSlot = slotted(
  80,
  choice(
    'textSize',
    'Text size',
    "How big the text is, in steps of the phone's own size.",
    TEXT_SIZES.map((t) => ({ value: t.id, label: t.label })),
    async () => textSizeId(await getTextSize()),
    async (value) => {
      const percent = TEXT_SIZES.find((t) => t.id === value)?.percent ?? Number(value);
      await setTextSize(percent);
      publish({ kind: 'text-size-changed', percent: await getTextSize() });
    },
    { section: 'appearance' },
  ),
);

export const layoutSlot = slotted(
  90,
  choice(
    'layout',
    'Layout',
    'Verses one per line, or run together in paragraphs.',
    LAYOUTS.map((l) => ({ value: l.id, label: l.label })),
    getLayout,
    async (value) => {
      await setLayout(value as ReadingLayout);
      publish({ kind: 'layout-changed', layout: value as ReadingLayout });
    },
    {
      section: 'layout',
      help: 'How the verses are set on the page:\n\n- **Verse by verse**: one verse per line.\n- **Paragraph**: runs the verses of a paragraph together, with small verse numbers.',
    },
  ),
);

export const sectionHeadingsSlot = slotted(
  100,
  choice(
    'sectionHeadings',
    'Section headings',
    "The Bible's headings above their verses, shown or not.",
    ON_OFF,
    getSectionHeadings,
    async (value) => {
      await setSectionHeadings(value as SectionHeadings);
      publish({ kind: 'headings-changed', headings: value as SectionHeadings });
    },
    { section: 'headings' },
  ),
);
