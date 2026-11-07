// scripts/sermons/osis.ts — the OSIS reader now lives in src/sermons/osis.ts (the Sermons sheet reads the sermon index service's references with it, mw-qtu3zvz.5); the build keeps importing it from here.
export { parseOsisRef } from '../../src/sermons/osis';
export type { OsisResult, VerseCounts } from '../../src/sermons/osis';
