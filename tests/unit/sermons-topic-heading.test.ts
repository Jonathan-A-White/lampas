// The heading of a topic's sermons, 'On <topic>' (mw-qtu3zvz.58): the module sorts a name surname-first ('Sinner's Friend, Christ the'), and the heading says it in reader order.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { topicHeading } from '../../src/sermons/topicHeading';

describe('topicHeading: On <topic> in reader order', () => {
  it.each([
    ["Sinner's Friend, Christ the", "On Christ the Sinner's Friend"],
    ['Compassion and Sympathy of Christ, The', 'On the Compassion and Sympathy of Christ'],
    ['Heavens, The Natural', 'On the Natural Heavens'],
    ['Dead, The', 'On the Dead'],
    ['Pilgrimage, Life as a', 'On Life as a Pilgrimage'],
    ["Probation, Man's Earthly Life a", "On Man's Earthly Life a Probation"],
    ['Time, The Right Use of', 'On the Right Use of Time'],
    ['Canaan, Land of', 'On Land of Canaan'],
    ['Body, Human', 'On Human Body'],
    ['Arts of the', 'On Arts'],
  ])('%s gives %s', (label, heading) => {
    expect(topicHeading(label)).toBe(heading);
  });

  it('leaves a name that is already in reader order, and one it cannot read safely, as the module has it', () => {
    expect(topicHeading('Love-Hatred')).toBe('On Love-Hatred');
    expect(topicHeading('Love-Hatred: Of God')).toBe('On Love-Hatred: Of God');
    expect(topicHeading('Timothy, Or Timotheus')).toBe('On Timothy, Or Timotheus');
    expect(topicHeading('Privileges, Special, Of Believers')).toBe('On Privileges, Special, Of Believers');
    expect(topicHeading('Rephaim, Or Giants, The')).toBe('On the Rephaim, Or Giants');
    expect(topicHeading('Bible, The; The Word of God')).toBe('On Bible, The; The Word of God');
  });

  it('reorders the name before a part, and keeps the part', () => {
    expect(topicHeading('Church, The: Of Christ')).toBe('On the Church: Of Christ');
  });

  it('sweep: no top-level topic label of any theme list makes a heading ending in an article', () => {
    const labels = new Set<string>();
    const root = join(__dirname, '../../public/themes');
    for (const dir of readdirSync(root)) {
      if (!statSync(join(root, dir)).isDirectory()) continue;
      for (const file of readdirSync(join(root, dir))) {
        const book = JSON.parse(readFileSync(join(root, dir, file), 'utf8')) as { topics: { label: string }[] };
        for (const t of book.topics) labels.add(t.label);
      }
    }
    expect(labels.size).toBeGreaterThan(1000);
    const bad = [...labels].filter((label) => /(, The| the| The| a)$/.test(topicHeading(label)));
    expect(bad).toEqual([]);
  });
});
