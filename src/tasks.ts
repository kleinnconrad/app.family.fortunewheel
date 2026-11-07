/** A single challenge on the wheel. All user-facing strings are German. */
export interface Task {
  /** Text shown on the wheel, in the result card and read aloud. */
  readonly text: string;
  /** Decorative emoji shown on the wheel segment and in the result card. */
  readonly emoji: string;
  /** Segment background colour (dark text must stay readable on it). */
  readonly color: string;
  /** Optional countdown in seconds, offered as a timer for timed challenges. */
  readonly timerSeconds?: number;
}

/**
 * The challenges on the wheel, in clockwise order starting at 12 o'clock.
 * Edit this list to change the wheel – layout and colours adapt automatically.
 */
export const TASKS: readonly Task[] = [
  { text: 'Male irgendwas, aber in nur 10 Sekunden', emoji: '⏱️', color: '#FFD84D', timerSeconds: 10 },
  { text: 'Male eine Sonne mit geschlossenen Augen', emoji: '☀️', color: '#FFA94D' },
  { text: 'Male ein Haus mit der schwachen Hand', emoji: '🏠', color: '#FF7B7B' },
  { text: 'Ziehe einen geraden Strich von einer Bildzeitung zur anderen', emoji: '📏', color: '#F79AC0' },
  { text: 'Zerschneide das Blatt in zwei Teile', emoji: '✂️', color: '#BE9BF7' },
  { text: 'Male einen Regenbogen – aber nur mit einer Farbe', emoji: '🌈', color: '#74B9F0' },
  { text: 'Male Wolken – aber nur mit geraden Strichen', emoji: '☁️', color: '#5ED6C8' },
  { text: 'Zerknüll das Papier und streiche es wieder glatt', emoji: '📃', color: '#9BE07A' },
];
