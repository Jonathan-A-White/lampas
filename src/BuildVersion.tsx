// src/BuildVersion.tsx: 'v<version> · <UTC time> · <commit>', stamped by the build (vite.config.ts), so he can
// tell on his phone whether a new build has loaded. Shown on Home (under the chapter) and on Unlock.
export function BuildVersion({ className = '' }: { className?: string }) {
  return (
    <p data-testid="build-version" className={`break-words text-center text-sm text-muted ${className}`}>
      v{__APP_VERSION__}
    </p>
  );
}
