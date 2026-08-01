"use client";

export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return (
    <main className="fatal-error">
      <p className="kicker">Preflight interrupted</p>
      <h1>The route graph could not be rendered.</h1>
      <p>Your redirect map stayed in this browser tab.</p>
      <button type="button" onClick={reset}>
        Reload the preflight desk
      </button>
    </main>
  );
}
