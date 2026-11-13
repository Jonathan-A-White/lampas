// The Study list drawn by itself (mw-indx1x6.8, src/review/StudyList.tsx): rows most-missed first, the one 'Ask the tutor about these' row at the end and only with a licence, nothing for no misses.
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LicenceContext, type LicenceDetail } from '../../src/gate/licenceContext';
import { StudyList } from '../../src/review/StudyList';
import type { Study } from '../../src/review/studyThis';

const NO_LICENCE: LicenceDetail = { licence: 'not-licensed', locked: null, publicKeyHex: '', checkAgain: () => {}, siteIssued: false, removed: () => {} };
const miss = (n: number) => ({ asked: `Question ${n}`, answer: `mine ${n}`, right: `right ${n}`, idea: `Idea ${n}` });
const taught = (n: number, ideaId: string): Study => ({ links: [{ kind: 'lesson', label: `Lesson: ${ideaId}`, ideaId }], miss: miss(n) });
const nothing = (n: number): Study => ({ links: [], miss: miss(n) });

afterEach(cleanup);

const labels = (): string[] => within(screen.getByRole('group', { name: 'Study list' })).getAllByRole('button').map((b) => b.textContent ?? '');

describe('the Study list', () => {
  it('draws nothing for a session with no misses', () => {
    render(<StudyList studies={[]} screen="Review" back="Back to Review" />);
    expect(screen.queryByRole('group', { name: 'Study list' })).toBeNull();
  });

  it('puts the most-missed first and the Ask the tutor about these row last, once, for all the misses nothing teaches', () => {
    render(<StudyList studies={[taught(1, 'noun'), nothing(2), taught(3, 'verb'), nothing(4), taught(5, 'verb')]} screen="Review" back="Back to Review" />);
    expect(labels()).toEqual(['Lesson: verb2 misses', 'Lesson: noun', 'Ask the tutor about these']);
  });

  it('leaves the Ask the tutor about these row out without a licence, and the list too when that is all it would hold', () => {
    render(
      <LicenceContext.Provider value={NO_LICENCE}>
        <StudyList studies={[taught(1, 'noun'), nothing(2)]} screen="Review" back="Back to Review" />
      </LicenceContext.Provider>,
    );
    expect(labels()).toEqual(['Lesson: noun']);
    cleanup();
    render(
      <LicenceContext.Provider value={NO_LICENCE}>
        <StudyList studies={[nothing(2)]} screen="Review" back="Back to Review" />
      </LicenceContext.Provider>,
    );
    expect(screen.queryByRole('group', { name: 'Study list' })).toBeNull();
  });
});
