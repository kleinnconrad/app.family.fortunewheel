import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startCountdown, type CountdownTick } from './countdown';

describe('startCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down whole seconds and finishes once', () => {
    const seconds: number[] = [];
    const onDone = vi.fn();
    startCountdown(3, {
      onTick: (tick: CountdownTick) => {
        if (tick.secondChanged) seconds.push(tick.secondsLeft);
      },
      onDone,
    });

    vi.advanceTimersByTime(5000);

    expect(seconds).toEqual([3, 2, 1, 0]);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('reports the remaining fraction', () => {
    const fractions: number[] = [];
    startCountdown(10, { onTick: (tick) => fractions.push(tick.fractionLeft), onDone: () => {} });
    vi.advanceTimersByTime(5000);
    expect(fractions[0]).toBe(1);
    expect(fractions.at(-1)).toBeCloseTo(0.5);
  });

  it('stops when cancelled', () => {
    const onTick = vi.fn();
    const onDone = vi.fn();
    const countdown = startCountdown(2, { onTick, onDone });
    countdown.cancel();
    onTick.mockClear();

    vi.advanceTimersByTime(5000);

    expect(onTick).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });
});
