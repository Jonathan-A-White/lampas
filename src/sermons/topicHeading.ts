// src/sermons/topicHeading.ts — the heading of one topic's sermons, 'On <topic>' (mw-qtu3zvz.58). The theme lists sort a name surname-first ('Sinner's Friend, Christ the', 'Dead, The', 'Heavens, The Natural'), so a heading that
// only prefixed 'On' read as broken English. The heading says the name in reader order ('On Christ the Sinner's Friend', 'On the Dead'); the Themes line and the lists keep the module's own label.

/** A tail that is not the first words of a name but a note on it ('Or Timotheus', 'Of the Tabernacle'): the label is left as the module has it. */
const NOTE = /^(or|of|and)\s/i;

/** The topic's name in reader order: one comma ('Head, Tail') turns to 'Tail Head' and a tail 'The ...' to 'the ...'; a name with more commas, a semicolon or a note after the comma is left alone. */
export function readerOrder(name: string): string {
  const cut = name.replace(/\s+of the$/i, '');
  // a name with a note and then ', The' ('Rephaim, Or Giants, The') takes the article at the front and keeps the rest as the module has it
  if (/,.*,\s*The$/.test(cut)) return `the ${cut.replace(/,\s*The$/, '')}`;
  const parts = cut.split(',').map((part) => part.trim());
  if (parts.length !== 2 || cut.includes(';') || !parts[0] || !parts[1] || NOTE.test(parts[1])) return cut;
  const [head, tail] = parts;
  return `${tail.replace(/^The(?=\s|$)/, 'the')} ${head}`;
}

/** 'On <topic>': a label of a topic as the module writes it, with its part after a colon where the Themes line names one. */
export function topicHeading(label: string): string {
  const colon = label.indexOf(': ');
  const base = colon < 0 ? label : label.slice(0, colon);
  const part = colon < 0 ? '' : label.slice(colon);
  return `On ${readerOrder(base)}${part}`;
}
