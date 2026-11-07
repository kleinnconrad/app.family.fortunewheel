/**
 * Pure helpers for the spin maths.
 *
 * Angles are in degrees and measured clockwise, with 0° at 12 o'clock where the
 * pointer sits. Segment `i` covers wheel angles `[i * size, (i + 1) * size)`.
 * A wheel rotated by `r` degrees shows wheel angle `-r` under the pointer.
 */

/** Maps any angle into the range [0, 360). */
export function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/** Index of the segment under the pointer for the given wheel rotation. */
export function segmentAtRotation(rotation: number, segmentCount: number): number {
  const size = 360 / segmentCount;
  const angleUnderPointer = normalizeDegrees(-rotation);
  return Math.min(segmentCount - 1, Math.floor(angleUnderPointer / size));
}

/**
 * Rotation at which the wheel has to stop so the pointer rests inside
 * `targetIndex`, after spinning `fullTurns` complete turns from `current`.
 * `offsetFraction` (0–1) picks where inside the segment the pointer lands.
 */
export function computeTargetRotation(
  current: number,
  targetIndex: number,
  segmentCount: number,
  fullTurns: number,
  offsetFraction: number,
): number {
  const size = 360 / segmentCount;
  const targetAngle = (targetIndex + offsetFraction) * size;
  const remainder = normalizeDegrees(-targetAngle - current);
  return current + fullTurns * 360 + remainder;
}

/**
 * Picks a uniformly random index in `[0, count)`, never returning `exclude`
 * (so the same challenge does not come up twice in a row).
 */
export function pickRandomIndex(count: number, exclude: number | null, random: () => number): number {
  if (count <= 1) return 0;
  const excluded = exclude !== null && exclude >= 0 && exclude < count;
  const candidates = excluded ? count - 1 : count;
  let index = Math.min(candidates - 1, Math.floor(random() * candidates));
  if (excluded && index >= exclude) index += 1;
  return index;
}

/** Fast start, long gentle stop – feels like a real wheel losing momentum. */
export function easeOutQuart(progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  return 1 - (1 - t) ** 4;
}

/** Uniform random number in [0, 1) from the cryptographic RNG. */
export function cryptoRandom(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return (buffer[0] ?? 0) / 2 ** 32;
}
