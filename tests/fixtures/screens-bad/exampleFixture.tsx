// A second file named like the fixture's first (tests/unit/screen-gather.test.tsx): a name twice is a mistake.
import { defineScreen, type Route } from '../../../src/nav/screen';

export const againScreen = defineScreen({ name: 'exampleFixture' as Route, render: () => <p>again</p> });
