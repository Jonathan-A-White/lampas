// A control file as src/settings/controls/ has them, for tests/unit/settings-gather.test.tsx: a control and the rows it draws.
import { draws, type Control } from '../../../src/settings/controls/types';

export const ExampleControl: Control = () => null;
export const exampleControlDraws = draws(ExampleControl, 'exampleFixture', { prefixes: ['example.'] });
