// A second control for a row example.tsx already draws, for the test that two controls for one row is refused.
import { draws, type Control } from '../../src/settings/controls/types';

export const ClashControl: Control = () => null;
export const clashControlDraws = draws(ClashControl, 'exampleFixture');
