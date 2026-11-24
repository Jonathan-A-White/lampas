// A screen file as src/screens/ has them, for tests/unit/screen-gather.test.tsx: a screen that only a fixture brings.
import { defineScreen, type Route } from '../../../src/nav/screen';

export const exampleScreen = defineScreen({ name: 'exampleFixture' as Route, render: () => <p>the example screen</p> });
