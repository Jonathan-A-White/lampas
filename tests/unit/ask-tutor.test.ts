// The screens' context for the tutor (src/tutor/screen.ts): every full screen has a name and suggested questions, facts are fitted to the
// schema's limits, and the screen reports its facts to the one store the Ask the tutor control reads.
import { describe, expect, it } from 'vitest';
import { FACT_LABEL_MAX, FACT_VALUE_MAX, MAX_FACTS, SCREEN_NAMES, SIMPLEST_VERSE, fitScreen, suggestionsFor } from '../../src/tutor/screen';
import { reportScreen, screenContextNow } from '../../src/tutor/screenContext';

describe('screen names and suggestions', () => {
  it('names every route but the Reader, and each has two or three suggested questions', () => {
    expect(Object.keys(SCREEN_NAMES).sort()).toEqual(['about', 'drill', 'goal', 'import', 'paradigms', 'placement', 'preface', 'review', 'settings', 'studyway', 'test', 'words']);
    for (const name of Object.values(SCREEN_NAMES)) {
      const questions = suggestionsFor(name);
      expect(questions.length, name).toBeGreaterThanOrEqual(2);
      expect(questions.length, name).toBeLessThanOrEqual(3);
      for (const q of questions) expect(q.length, q).toBeLessThanOrEqual(150);
    }
  });

  it('asks for the simplest verse on Goal, and nowhere else', () => {
    expect(SIMPLEST_VERSE).toBe("What's the simplest verse in the New Testament for me to learn first, given where I am?");
    expect(suggestionsFor('Goal')).toContain(SIMPLEST_VERSE);
    for (const name of Object.values(SCREEN_NAMES).filter((n) => n !== 'Goal')) expect(suggestionsFor(name)).not.toContain(SIMPLEST_VERSE);
  });
});

describe('fitScreen', () => {
  it('cuts what the schema would refuse: the fact count, the label, the value, and drops a fact with nothing in it', () => {
    const facts = Array.from({ length: MAX_FACTS + 3 }, (_, i) => ({ label: 'L'.repeat(FACT_LABEL_MAX + 5) + i, value: 'v'.repeat(FACT_VALUE_MAX + 50) }));
    const fitted = fitScreen({ name: 'Goal', facts: [{ label: 'Empty', value: '  ' }, ...facts] });
    expect(fitted.facts).toHaveLength(MAX_FACTS);
    for (const f of fitted.facts) {
      expect(f.label.length).toBeLessThanOrEqual(FACT_LABEL_MAX);
      expect(f.value.length).toBeLessThanOrEqual(FACT_VALUE_MAX);
    }
  });
});

describe('the screen context store', () => {
  it('holds what the screen on show reported, and forgets it when the screen goes', () => {
    const off = reportScreen({ name: 'Goal', facts: [{ label: 'Goal', value: 'Read 1 John 1:1' }] });
    expect(screenContextNow()).toEqual({ name: 'Goal', facts: [{ label: 'Goal', value: 'Read 1 John 1:1' }] });
    off();
    expect(screenContextNow()).toBeNull();
  });

  it('is not emptied by an older screen that goes after a newer one reported', () => {
    const first = reportScreen({ name: 'Words', facts: [] });
    const second = reportScreen({ name: 'Goal', facts: [] });
    first();
    expect(screenContextNow()?.name).toBe('Goal');
    second();
    expect(screenContextNow()).toBeNull();
  });
});
