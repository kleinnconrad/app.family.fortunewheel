/**
 * Fits the challenge texts into the wedge-shaped wheel segments.
 *
 * Text runs radially (from the hub towards the rim) and may wrap onto several
 * lines. For every text we try 1…maxLines lines, wrap the words as evenly as
 * possible and compute the largest font size for which the text block still
 * fits inside the wedge. All segments then share the smallest of those sizes
 * so the wheel looks uniform.
 */

/** Returns the width of `text` rendered at font size 1. */
export type Measure = (text: string) => number;

export interface SegmentGeometry {
  /** Half of the segment's opening angle, in radians. */
  readonly halfAngle: number;
  /** Closest distance to the centre the text may reach. */
  readonly innerRadius: number;
  /** Furthest distance from the centre the text may reach. */
  readonly outerRadius: number;
  /** Minimum gap between the text and the segment's straight edges. */
  readonly padding: number;
  /** Line height as a multiple of the font size. */
  readonly lineHeight: number;
}

export interface TextBlock {
  readonly lines: readonly string[];
  readonly fontSize: number;
  /** Distance from the wheel centre to the middle of the text block. */
  readonly center: number;
}

interface WrappedText {
  readonly lines: string[];
  /** Width of the widest line at font size 1. */
  readonly width: number;
}

interface Candidate extends WrappedText {
  readonly maxFontSize: number;
}

/** Splits text into words, keeping dashes attached to the preceding word. */
export function tokenize(text: string): string[] {
  const words: string[] = [];
  for (const word of text.trim().split(/\s+/)) {
    if (!word) continue;
    const previous = words.length - 1;
    if (/^[–—-]$/.test(word) && previous >= 0) {
      words[previous] = `${words[previous]} ${word}`;
    } else {
      words.push(word);
    }
  }
  return words;
}

/** Wraps `words` into exactly `lineCount` lines, minimising the widest line. */
export function wrapBalanced(words: readonly string[], lineCount: number, measure: Measure): WrappedText | null {
  if (lineCount < 1 || lineCount > words.length) return null;
  let best: WrappedText | null = null;

  const search = (start: number, linesLeft: number, lines: string[], widest: number): void => {
    if (best && widest >= best.width) return;
    if (linesLeft === 1) {
      const line = words.slice(start).join(' ');
      const width = Math.max(widest, measure(line));
      if (!best || width < best.width) best = { lines: [...lines, line], width };
      return;
    }
    for (let end = start + 1; end <= words.length - (linesLeft - 1); end++) {
      const line = words.slice(start, end).join(' ');
      search(end, linesLeft - 1, [...lines, line], Math.max(widest, measure(line)));
    }
  };

  search(0, lineCount, [], 0);
  return best;
}

/**
 * Largest font size at which a block of `lineCount` lines, whose widest line
 * is `width` (at font size 1), fits inside the segment.
 *
 * Two constraints compete: the block must be short enough to fit between the
 * inner edge and the rim, and its inner end must sit far enough out that the
 * wedge is wide enough for all lines. We place the inner edge where both
 * limits meet.
 */
export function maxFontSize(width: number, lineCount: number, geometry: SegmentGeometry): number {
  const { halfAngle, innerRadius, outerRadius, padding, lineHeight } = geometry;
  if (width <= 0) return Number.POSITIVE_INFINITY;
  const slope = Math.tan(halfAngle);
  const heightEm = 1 + lineHeight * (lineCount - 1);
  const balancedInnerEdge = (heightEm * outerRadius + 2 * width * padding) / (heightEm + 2 * width * slope);
  const innerEdge = Math.max(innerRadius, balancedInnerEdge);
  const byLength = (outerRadius - innerEdge) / width;
  const byHeight = (2 * (innerEdge * slope - padding)) / heightEm;
  return Math.max(0, Math.min(byLength, byHeight));
}

/** Lays out every text; all blocks share one font size and hug the rim. */
export function layoutSegmentTexts(
  texts: readonly string[],
  geometry: SegmentGeometry,
  measure: Measure,
  options: { maxLines: number; maxFontSize: number },
): TextBlock[] {
  const bestCandidates = texts.map((text): Candidate | null => {
    const words = tokenize(text);
    let best: Candidate | null = null;
    for (let lineCount = 1; lineCount <= Math.min(options.maxLines, words.length); lineCount++) {
      const wrapped = wrapBalanced(words, lineCount, measure);
      if (!wrapped) continue;
      const candidate = { ...wrapped, maxFontSize: maxFontSize(wrapped.width, lineCount, geometry) };
      if (!best || candidate.maxFontSize > best.maxFontSize) best = candidate;
    }
    return best;
  });

  const fontSize = Math.min(options.maxFontSize, ...bestCandidates.map((c) => c?.maxFontSize ?? Infinity));

  return bestCandidates.map((candidate) => {
    if (!candidate) return { lines: [], fontSize, center: geometry.outerRadius };
    return {
      lines: candidate.lines,
      fontSize,
      center: geometry.outerRadius - (candidate.width * fontSize) / 2,
    };
  });
}
