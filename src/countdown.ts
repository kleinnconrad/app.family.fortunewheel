export interface CountdownTick {
  /** Whole seconds left, rounded up (10, 9, …, 1, 0). */
  readonly secondsLeft: number;
  /** Remaining share of the total time, from 1 down to 0. */
  readonly fractionLeft: number;
  /** True when `secondsLeft` changed since the previous tick. */
  readonly secondChanged: boolean;
}

export interface Countdown {
  cancel(): void;
}

/** Runs a countdown, reporting progress every `intervalMs` and once at the end. */
export function startCountdown(
  seconds: number,
  callbacks: { onTick(tick: CountdownTick): void; onDone(): void },
  intervalMs = 100,
): Countdown {
  const totalMs = seconds * 1000;
  const endsAt = Date.now() + totalMs;
  let previousSeconds: number | null = null;
  let finished = false;

  const update = (): void => {
    if (finished) return;
    const leftMs = Math.max(0, endsAt - Date.now());
    const secondsLeft = Math.ceil(leftMs / 1000);
    callbacks.onTick({
      secondsLeft,
      fractionLeft: totalMs > 0 ? leftMs / totalMs : 0,
      secondChanged: secondsLeft !== previousSeconds,
    });
    previousSeconds = secondsLeft;
    if (leftMs === 0) {
      finished = true;
      clearInterval(timer);
      callbacks.onDone();
    }
  };

  const timer = setInterval(update, intervalMs);
  update();

  return {
    cancel() {
      finished = true;
      clearInterval(timer);
    },
  };
}
