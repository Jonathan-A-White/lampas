// tests/support/fixture-path.ts — a second grammar approach for the tests (mw-foy5mb.1). Lampas lists ONE path, the ladder, but the machinery
// (orderOf, nextLessonOf, the placement walk, Learn next) must work for any approach, and a test needs one whose order is NOT the ladder's
// (it teaches the aorist before the genitive). It is a copy of the record of BMA Tutor's order, under a name of its own and with no credit, so
// no test names a listed approach that does not exist.
import { bmaTutor } from '../../src/approaches/bma-tutor';
import type { GrammarApproach } from '../../src/approaches';

export const fixturePath: GrammarApproach = { ...bmaTutor, id: 'fixture', name: 'Fixture path', credit: null };
