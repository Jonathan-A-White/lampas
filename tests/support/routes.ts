// tests/support/routes.ts — the one way a test reaches the app's screens and addresses (src/nav/route.ts: Route, ROUTES, ROUTE_TABLE, routeOf, hashFor, navigate and the openers, the address readers).
// A test imports from here and never from src/nav/route itself, so a change to how a screen registers is made in this file and not in dozens of tests (mw-6ww.175.83, stage 3 of the Lampas registry).
import * as routeModule from '../../src/nav/route';

export * from '../../src/nav/route';
export { ADDRESSES, defineScreen, nameOfFile, renderersOf, routeIn, routeTableOf, type Modules as ScreenModules, type ScreenAddress, type ScreenDef } from '../../src/nav/screen';

/** The route module as a whole, for a test that wraps one of its functions (a spy on it is seen by the app, which imports the same module). */
export { routeModule };
