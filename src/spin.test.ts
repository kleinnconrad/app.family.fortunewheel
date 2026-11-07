import { describe, expect, it } from 'vitest';
import {
  computeTargetRotation,
  cryptoRandom,
  easeOutQuart,
  normalizeDegrees,
  pickRandomIndex,
  segmentAtRotation,
} from './spin';

describe('normalizeDegrees', () => {
  it.each([
    [0, 0],
    [360, 0],
    [725, 5],
    [-90, 270],
    [-720, 0],
  ])('maps %d to %d', (input, expected) => {
    expect(normalizeDegrees(input)).toBe(expected);
  });
});

describe('segmentAtRotation', () => {
  it('shows segment 0 under the pointer when the wheel is not rotated', () => {
    expect(segmentAtRotation(0, 8)).toBe(0);
  });

  it('brings the last segment under the pointer after a small clockwise turn', () => {
    expect(segmentAtRotation(10, 8)).toBe(7);
  });

  it('brings segment 1 under the pointer after turning back by one segment', () => {
    expect(segmentAtRotation(-50, 8)).toBe(1);
  });
});

describe('computeTargetRotation', () => {
  it('always lands on the requested segment, from any start angle', () => {
    for (const start of [0, 13.7, 359.9, 1234.5, -42]) {
      for (let target = 0; target < 8; target++) {
        for (const offset of [0.15, 0.5, 0.85]) {
          const end = computeTargetRotation(start, target, 8, 5, offset);
          expect(segmentAtRotation(end, 8)).toBe(target);
        }
      }
    }
  });

  it('spins clockwise at least the requested number of full turns, but less than one more', () => {
    const start = 100;
    const end = computeTargetRotation(start, 3, 8, 6, 0.5);
    expect(end - start).toBeGreaterThanOrEqual(6 * 360);
    expect(end - start).toBeLessThan(7 * 360);
  });
});

describe('pickRandomIndex', () => {
  it('covers every index when nothing is excluded', () => {
    const picks = [0, 0.13, 0.26, 0.38, 0.51, 0.63, 0.76, 0.99].map((r) => pickRandomIndex(8, null, () => r));
    expect(new Set(picks)).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7]));
  });

  it('never returns the excluded index', () => {
    for (let exclude = 0; exclude < 8; exclude++) {
      for (let i = 0; i < 100; i++) {
        expect(pickRandomIndex(8, exclude, () => i / 100)).not.toBe(exclude);
      }
    }
  });

  it('stays in range even for a random value of exactly 1', () => {
    expect(pickRandomIndex(8, null, () => 1)).toBe(7);
    expect(pickRandomIndex(8, 7, () => 1)).toBe(6);
  });

  it('returns 0 for a single segment', () => {
    expect(pickRandomIndex(1, 0, () => 0.5)).toBe(0);
  });
});

describe('easeOutQuart', () => {
  it('starts at 0, ends at 1 and clamps outside that range', () => {
    expect(easeOutQuart(0)).toBe(0);
    expect(easeOutQuart(1)).toBe(1);
    expect(easeOutQuart(-1)).toBe(0);
    expect(easeOutQuart(2)).toBe(1);
  });

  it('decelerates', () => {
    expect(easeOutQuart(0.25) - easeOutQuart(0)).toBeGreaterThan(easeOutQuart(1) - easeOutQuart(0.75));
  });
});

describe('cryptoRandom', () => {
  it('returns values in [0, 1)', () => {
    for (let i = 0; i < 1000; i++) {
      const value = cryptoRandom();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
