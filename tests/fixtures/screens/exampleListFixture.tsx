// A screen file that owns the addresses below its own path (tests/unit/screen-gather.test.tsx); the test says so in ADDRESSES' form.
import { defineScreen, type Route } from '../../../src/nav/screen';

export const exampleListScreen = defineScreen({ name: 'exampleListFixture' as Route, render: () => <p>the example list</p> });
