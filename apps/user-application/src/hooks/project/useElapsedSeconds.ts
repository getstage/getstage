import { useEffect, useState } from "react";

/**
 * Seconds a run has been going, ticking once a second while it is active.
 *
 * `startedAt` is the run's own start timestamp rather than the moment this hook
 * mounted, so a run recovered from Convex after a reload — or after the user
 * navigated to another tab and back — reports its true age instead of restarting
 * from zero. Returns 0 whenever no run is active.
 */
export function useElapsedSeconds(isRunning: boolean, startedAt: number | null): number {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isRunning || startedAt === null) {
      setElapsedSeconds(0);
      return;
    }

    const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [isRunning, startedAt]);

  return elapsedSeconds;
}

/** `Xm Ys` once past a minute, otherwise `Ys`. Shared by every generating state. */
export function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
