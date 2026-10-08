import { UpdateBanner } from './UpdateBanner';

export function App() {
  return (
    <div data-shell className="flex h-full min-w-0 flex-col overflow-clip">
      <UpdateBanner />
      <main className="screen flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <img src="/icon.svg" alt="" width={96} height={96} className="rounded-2xl" />
        <h1 className="font-greek text-4xl font-semibold">Lampas</h1>
        <p data-testid="build-version" className="break-words text-sm text-muted">
          {__APP_VERSION__}
        </p>
      </main>
    </div>
  );
}
