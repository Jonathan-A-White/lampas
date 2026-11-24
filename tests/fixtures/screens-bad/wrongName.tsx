// A screen file that declares a screen it is not named for (tests/unit/screen-gather.test.tsx).
import { defineScreen, type Route } from '../../../src/nav/screen';

export const wrongScreen = defineScreen({ name: 'somethingElse' as Route, render: () => <p>wrong</p> });
