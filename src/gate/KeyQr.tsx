// src/gate/KeyQr.tsx — the phone's key as a QR code, so Postern's Issue a licence scanner (which reads QR codes only) can take it.
// The modules are drawn as one SVG path (qr.ts): nothing touches a canvas or injects markup. Black on white with a quiet zone of 4
// modules, whatever the theme, because a scanner wants the contrast.
import { qrPath } from './qr';

const QUIET_ZONE = 4;

export function KeyQr({ text, label }: { text: string; label: string }) {
  const { size, path } = qrPath(text);
  const extent = size + QUIET_ZONE * 2;
  return (
    <svg
      role="img"
      aria-label={label}
      data-testid="key-qr"
      viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${extent} ${extent}`}
      shapeRendering="crispEdges"
      className="h-48 w-48 shrink-0 self-center rounded-lg"
    >
      <rect x={-QUIET_ZONE} y={-QUIET_ZONE} width={extent} height={extent} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}
