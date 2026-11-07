/**
 * Reads texts aloud in German using the browser's Web Speech API.
 * Works offline on most devices; quality depends on the installed voices.
 */

export type VoiceLike = Pick<SpeechSynthesisVoice, 'lang' | 'name' | 'default'>;

/** Picks the most suitable German voice, or `null` if none is installed. */
export function pickGermanVoice<V extends VoiceLike>(voices: readonly V[]): V | null {
  let best: V | null = null;
  let bestScore = -1;
  for (const voice of voices) {
    const lang = voice.lang.replace('_', '-').toLowerCase();
    if (!lang.startsWith('de')) continue;
    let score = lang === 'de-de' ? 4 : 2;
    // Neural/online voices sound much more natural than the classic ones.
    if (/natural|neural|online|google|premium|enhanced/i.test(voice.name)) score += 2;
    if (voice.default) score += 1;
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
}

const synth: SpeechSynthesis | null =
  typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

let germanVoice: SpeechSynthesisVoice | null = null;
let primed = false;
// Keep a reference to the active utterance: some browsers garbage-collect it
// mid-sentence otherwise.
let activeUtterance: SpeechSynthesisUtterance | null = null;

function refreshVoice(): void {
  if (synth) germanVoice = pickGermanVoice(synth.getVoices());
}

if (synth) {
  refreshVoice();
  synth.addEventListener?.('voiceschanged', refreshVoice);
}

export function isSpeechSupported(): boolean {
  return synth !== null;
}

/**
 * Mobile Safari only allows speech that was started by a user gesture.
 * Speaking a silent utterance once from a click handler unlocks later calls.
 */
export function primeSpeech(): void {
  if (!synth || primed) return;
  primed = true;
  const utterance = new SpeechSynthesisUtterance(' ');
  utterance.volume = 0;
  synth.speak(utterance);
}

export function stopSpeaking(): void {
  synth?.cancel();
  activeUtterance = null;
}

/** Reads `text` aloud in German. Returns false if speech is unavailable. */
export function speak(text: string): boolean {
  if (!synth) return false;
  synth.cancel();
  synth.resume();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = germanVoice?.lang ?? 'de-DE';
  if (germanVoice) utterance.voice = germanVoice;
  utterance.rate = 0.9;
  utterance.pitch = 1.05;
  utterance.onend = utterance.onerror = () => {
    if (activeUtterance === utterance) activeUtterance = null;
  };
  activeUtterance = utterance;
  synth.speak(utterance);
  return true;
}
