/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Both are globals set by a script in index.html (vite.config.ts versionGlobals), so no chunk holds the build's stamp.
declare const __APP_VERSION__: string;
/** package.json's version alone: '0.1.8'. */
declare const __APP_SEMVER__: string;
