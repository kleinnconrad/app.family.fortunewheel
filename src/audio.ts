/**
 * Tiny synthesised sound effects (Web Audio API) – no audio files needed.
 * Browsers only allow audio after a user gesture, so call `unlockAudio()`
 * from a click handler before playing anything.
 */

type AudioContextConstructor = typeof AudioContext;

let context: AudioContext | null = null;
let master: GainNode | null = null;

function getContext(): AudioContext | null {
  if (context) return context;
  const Constructor: AudioContextConstructor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  if (!Constructor) return null;
  context = new Constructor();
  master = context.createGain();
  master.gain.value = 0.6;
  master.connect(context.destination);
  return context;
}

/** Creates (or resumes) the audio context. Must run inside a user gesture. */
export function unlockAudio(): void {
  const ctx = getContext();
  if (ctx?.state === 'suspended') void ctx.resume();
}

interface Tone {
  frequency: number;
  endFrequency?: number;
  start: number;
  duration: number;
  type: OscillatorType;
  volume: number;
}

function playTone(ctx: AudioContext, tone: Tone): void {
  if (!master) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = tone.type;
  oscillator.frequency.setValueAtTime(tone.frequency, tone.start);
  if (tone.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(tone.endFrequency, tone.start + tone.duration);
  }
  gain.gain.setValueAtTime(0.0001, tone.start);
  gain.gain.exponentialRampToValueAtTime(tone.volume, tone.start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, tone.start + tone.duration);
  oscillator.connect(gain).connect(master);
  oscillator.start(tone.start);
  oscillator.stop(tone.start + tone.duration + 0.05);
}

function runningContext(): AudioContext | null {
  const ctx = getContext();
  return ctx?.state === 'running' ? ctx : null;
}

/** Short click whenever a segment passes the pointer. */
export function playTick(): void {
  const ctx = runningContext();
  if (!ctx) return;
  playTone(ctx, { frequency: 1900, endFrequency: 900, start: ctx.currentTime, duration: 0.045, type: 'triangle', volume: 0.35 });
}

/** Cheerful little fanfare when the wheel stops. */
export function playFanfare(): void {
  const ctx = runningContext();
  if (!ctx) return;
  const notes: Array<[frequency: number, offset: number, duration: number]> = [
    [523.25, 0, 0.14],
    [659.25, 0.13, 0.14],
    [783.99, 0.26, 0.14],
    [1046.5, 0.39, 0.5],
  ];
  for (const [frequency, offset, duration] of notes) {
    const start = ctx.currentTime + offset;
    playTone(ctx, { frequency, start, duration, type: 'triangle', volume: 0.45 });
    playTone(ctx, { frequency: frequency * 2, start, duration, type: 'sine', volume: 0.08 });
  }
}

/** "Ding-dong" when the countdown is over. */
export function playTimeUp(): void {
  const ctx = runningContext();
  if (!ctx) return;
  playTone(ctx, { frequency: 880, start: ctx.currentTime, duration: 0.6, type: 'sine', volume: 0.5 });
  playTone(ctx, { frequency: 660, start: ctx.currentTime + 0.35, duration: 0.9, type: 'sine', volume: 0.5 });
}
