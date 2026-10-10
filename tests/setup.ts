import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
// Not '@testing-library/react': importing it here would register its auto-unmount before
// the step files' dont-cleanup-after-each import can switch that off.
import { configure } from '@testing-library/dom';
import { ASYNC_WAIT_MS } from './support/timeouts';

// waitFor/findBy default to 1 s, which a loaded host outruns; ASYNC_WAIT_MS (tests/support/timeouts.ts) is the one wait. vitest's testTimeout (20 s) stays above it.
configure({ asyncUtilTimeout: ASYNC_WAIT_MS });
