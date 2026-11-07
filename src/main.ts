import '@fontsource-variable/fredoka';
import './style.css';

import { playFanfare, playTick, playTimeUp, unlockAudio } from './audio';
import { launchConfetti } from './confetti';
import { startCountdown, type Countdown } from './countdown';
import { isSpeechSupported, primeSpeech, speak, stopSpeaking } from './speech';
import {
  computeTargetRotation,
  cryptoRandom,
  easeOutQuart,
  normalizeDegrees,
  pickRandomIndex,
  segmentAtRotation,
} from './spin';
import { TASKS, type Task } from './tasks';
import { createCanvasMeasure, renderWheel, WHEEL_FONT, WHEEL_FONT_WEIGHT } from './wheel';

const SPIN = {
  minTurns: 5,
  extraTurns: 3,
  minDurationMs: 5000,
  extraDurationMs: 1500,
  reducedMotionDurationMs: 1200,
  /** Pause between the fanfare and reading the task aloud. */
  announceDelayMs: 900,
} as const;

const SOUND_STORAGE_KEY = 'fortune-wheel:sound';

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

const ui = {
  wheelFrame: byId<HTMLDivElement>('wheel-frame'),
  wheel: byId<HTMLDivElement>('wheel'),
  pointer: byId<HTMLDivElement>('pointer'),
  spinButton: byId<HTMLButtonElement>('spin-button'),
  soundToggle: byId<HTMLButtonElement>('sound-toggle'),
  soundLabel: byId('sound-label'),
  result: byId('result'),
  resultEmoji: byId('result-emoji'),
  resultLabel: byId('result-label'),
  resultText: byId('result-text'),
  speakButton: byId<HTMLButtonElement>('speak-button'),
  timerButton: byId<HTMLButtonElement>('timer-button'),
  timer: byId<HTMLDivElement>('timer'),
  timerValue: byId('timer-value'),
  timerNote: byId('timer-note'),
  confetti: byId<HTMLCanvasElement>('confetti'),
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const state = {
  rotation: 0,
  spinning: false,
  lastIndex: null as number | null,
  currentTask: null as Task | null,
  soundOn: loadSoundPreference(),
  segments: [] as readonly SVGGElement[],
  countdown: null as Countdown | null,
  announceTimeout: undefined as number | undefined,
  pointerAnimation: null as Animation | null,
};

function loadSoundPreference(): boolean {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

function saveSoundPreference(on: boolean): void {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // Storage can be unavailable (private mode); the setting then lasts for this visit only.
  }
}

/** Waits (briefly) for the web font so text on the wheel is measured correctly. */
async function waitForFont(): Promise<void> {
  if (!('fonts' in document)) return;
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 2500));
  try {
    await Promise.race([document.fonts.load(`${WHEEL_FONT_WEIGHT} 100px ${WHEEL_FONT}`, 'Glücksrad ÄÖÜäöüß'), timeout]);
  } catch {
    // Fall back to whatever font is available.
  }
}

function applyRotation(): void {
  ui.wheel.style.transform = `rotate(${state.rotation}deg)`;
}

function wigglePointer(): void {
  if (reducedMotion.matches) return;
  state.pointerAnimation?.cancel();
  state.pointerAnimation = ui.pointer.animate(
    [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-16deg)' }, { transform: 'rotate(0deg)' }],
    { duration: 140, easing: 'ease-out' },
  );
}

function updateSoundToggle(): void {
  ui.soundToggle.setAttribute('aria-pressed', String(state.soundOn));
  ui.soundLabel.textContent = state.soundOn ? '🔊 Ton an' : '🔇 Ton aus';
}

function toggleSound(): void {
  state.soundOn = !state.soundOn;
  saveSoundPreference(state.soundOn);
  updateSoundToggle();
  if (state.soundOn) {
    unlockAudio();
  } else {
    clearTimeout(state.announceTimeout);
    stopSpeaking();
  }
}

function announce(task: Task): void {
  primeSpeech();
  speak(`Deine Aufgabe: ${task.text}.`);
}

function cancelCountdown(): void {
  state.countdown?.cancel();
  state.countdown = null;
  ui.timer.hidden = true;
  ui.timer.classList.remove('is-done');
  ui.timerNote.textContent = '';
  ui.timerButton.disabled = false;
}

function setResultContent(emoji: string, label: string, text: string): void {
  ui.resultEmoji.textContent = emoji;
  ui.resultLabel.textContent = label;
  ui.resultText.textContent = text;
}

function showSpinning(): void {
  ui.result.classList.remove('is-revealed');
  ui.result.style.removeProperty('--task-color');
  setResultContent('🎡', 'Gleich geht’s los …', 'Das Rad dreht sich!');
  ui.speakButton.hidden = true;
  ui.timerButton.hidden = true;
  ui.wheelFrame.classList.remove('has-winner');
  state.segments.forEach((segment) => segment.classList.remove('is-winner'));
  ui.wheelFrame.classList.add('is-spinning');
  ui.spinButton.disabled = true;
  ui.spinButton.textContent = 'Dreht sich …';
}

function showResult(task: Task, index: number): void {
  ui.wheelFrame.classList.remove('is-spinning');
  ui.wheelFrame.classList.add('has-winner');
  state.segments[index]?.classList.add('is-winner');

  setResultContent(task.emoji, 'Deine Aufgabe', task.text);
  ui.result.style.setProperty('--task-color', task.color);
  // Restart the reveal animation.
  void ui.result.offsetWidth;
  ui.result.classList.add('is-revealed');

  ui.speakButton.hidden = !isSpeechSupported();
  ui.timerButton.hidden = !task.timerSeconds;
  if (task.timerSeconds) ui.timerButton.textContent = `⏱️ ${task.timerSeconds}-Sekunden-Timer starten`;

  ui.spinButton.disabled = false;
  ui.spinButton.textContent = 'Nochmal drehen!';

  if (!reducedMotion.matches) {
    // Party poppers in both bottom corners – visible no matter where the page is scrolled.
    const { innerWidth: width, innerHeight: height } = window;
    launchConfetti(ui.confetti, [
      { x: width * 0.05, y: height, direction: 25, spread: 40, amount: 80 },
      { x: width * 0.95, y: height, direction: -25, spread: 40, amount: 80 },
    ]);
  }

  // On small screens the result card sits below the wheel – bring it into view.
  ui.result.scrollIntoView({ block: 'nearest', behavior: reducedMotion.matches ? 'auto' : 'smooth' });

  if (state.soundOn) {
    playFanfare();
    state.announceTimeout = window.setTimeout(() => announce(task), SPIN.announceDelayMs);
  }
}

function spin(): void {
  if (state.spinning) return;
  state.spinning = true;

  // Audio and speech must be unlocked inside the click handler (mobile browsers).
  unlockAudio();
  clearTimeout(state.announceTimeout);
  stopSpeaking();
  primeSpeech();
  cancelCountdown();
  showSpinning();

  const count = TASKS.length;
  const target = pickRandomIndex(count, state.lastIndex, cryptoRandom);
  const reduce = reducedMotion.matches;
  const turns = reduce ? 1 : SPIN.minTurns + Math.floor(cryptoRandom() * (SPIN.extraTurns + 1));
  const offset = 0.15 + cryptoRandom() * 0.7; // never stop right on a divider
  const startRotation = state.rotation;
  const endRotation = computeTargetRotation(startRotation, target, count, turns, offset);
  const duration = reduce ? SPIN.reducedMotionDurationMs : SPIN.minDurationMs + cryptoRandom() * SPIN.extraDurationMs;

  let previousSegment = segmentAtRotation(startRotation, count);
  let lastTickAt = 0;
  const startedAt = performance.now();

  const frame = (now: number): void => {
    const progress = Math.min(1, (now - startedAt) / duration);
    state.rotation = startRotation + (endRotation - startRotation) * easeOutQuart(progress);
    applyRotation();

    const segment = segmentAtRotation(state.rotation, count);
    if (segment !== previousSegment) {
      previousSegment = segment;
      if (now - lastTickAt > 40) {
        lastTickAt = now;
        if (state.soundOn) playTick();
        wigglePointer();
      }
    }

    if (progress < 1) {
      requestAnimationFrame(frame);
      return;
    }

    // Keep the stored angle small; the wheel looks identical.
    state.rotation = normalizeDegrees(endRotation);
    applyRotation();
    state.spinning = false;
    state.lastIndex = target;
    const task = TASKS[target];
    if (!task) return;
    state.currentTask = task;
    showResult(task, target);
  };

  requestAnimationFrame(frame);
}

function startTimer(): void {
  const task = state.currentTask;
  if (!task?.timerSeconds || state.spinning) return;
  unlockAudio();
  clearTimeout(state.announceTimeout);
  cancelCountdown();

  ui.timer.hidden = false;
  ui.timerButton.disabled = true;
  ui.timer.scrollIntoView({ block: 'nearest', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  if (state.soundOn) speak('Los!');

  state.countdown = startCountdown(task.timerSeconds, {
    onTick: ({ secondsLeft, fractionLeft, secondChanged }) => {
      ui.timer.style.setProperty('--progress', fractionLeft.toFixed(3));
      if (!secondChanged) return;
      ui.timerValue.textContent = String(secondsLeft);
      if (state.soundOn && secondsLeft > 0 && secondsLeft <= 3) playTick();
    },
    onDone: () => {
      state.countdown = null;
      ui.timer.classList.add('is-done');
      ui.timerNote.textContent = 'Zeit ist um! ✋';
      ui.timerNote.scrollIntoView({ block: 'nearest', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      ui.timerButton.disabled = false;
      ui.timerButton.textContent = '⏱️ Timer nochmal starten';
      if (state.soundOn) {
        playTimeUp();
        speak('Zeit ist um!');
      }
    },
  });
}

async function init(): Promise<void> {
  await waitForFont();
  const wheel = renderWheel(TASKS, createCanvasMeasure());
  ui.wheel.replaceChildren(wheel.svg);
  state.segments = wheel.segments;
  applyRotation();
  updateSoundToggle();

  ui.spinButton.addEventListener('click', spin);
  ui.wheel.addEventListener('click', spin);
  ui.soundToggle.addEventListener('click', toggleSound);
  ui.speakButton.addEventListener('click', () => {
    if (state.currentTask) announce(state.currentTask);
  });
  ui.timerButton.addEventListener('click', startTimer);
  ui.spinButton.disabled = false;
}

void init();
