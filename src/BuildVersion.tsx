// src/BuildVersion.tsx: 'v<version> · <UTC time> · <commit>', stamped by the build (vite.config.ts), so he can
// tell on his phone whether a new build has loaded. Shown on Unlock and About (Home no longer shows it, mw-5r3p30.619), where
// it is a button: seven taps in 3 seconds turn on Developer mode (src/About.tsx).
export function BuildVersion({ className = '', onTap }: { className?: string; onTap?: () => void }) {
  const classes = `break-words text-center text-sm text-muted ${className}`;
  if (onTap) {
    return (
      <button type="button" data-testid="build-version" onClick={onTap} className={`${classes} block min-h-11 w-full select-none`}>
        v{__APP_VERSION__}
      </button>
    );
  }
  return (
    <p data-testid="build-version" className={classes}>
      v{__APP_VERSION__}
    </p>
  );
}
