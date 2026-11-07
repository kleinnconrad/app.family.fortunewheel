import { describe, expect, it } from 'vitest';
import { layoutSegmentTexts, maxFontSize, tokenize, wrapBalanced, type SegmentGeometry } from './layout';
import { TASKS } from './tasks';

// Monospace stand-in for real font metrics: every character is 0.55 em wide.
const measure = (text: string): number => text.length * 0.55;

const geometry: SegmentGeometry = {
  halfAngle: (22.5 * Math.PI) / 180,
  innerRadius: 146,
  outerRadius: 438,
  padding: 8,
  lineHeight: 1.1,
};

describe('tokenize', () => {
  it('keeps dashes attached to the previous word', () => {
    expect(tokenize('Male Wolken – aber nur')).toEqual(['Male', 'Wolken –', 'aber', 'nur']);
  });

  it('ignores surrounding and repeated whitespace', () => {
    expect(tokenize('  Male   ein Haus ')).toEqual(['Male', 'ein', 'Haus']);
  });
});

describe('wrapBalanced', () => {
  it('splits words into the requested number of lines with the narrowest widest line', () => {
    const result = wrapBalanced(['aaaa', 'bb', 'cc', 'dddd'], 2, measure);
    expect(result?.lines).toEqual(['aaaa bb', 'cc dddd']);
  });

  it('returns null when more lines than words are requested', () => {
    expect(wrapBalanced(['one'], 2, measure)).toBeNull();
  });
});

describe('maxFontSize', () => {
  it('gets smaller for longer lines', () => {
    expect(maxFontSize(10, 2, geometry)).toBeLessThan(maxFontSize(5, 2, geometry));
  });
});

describe('layoutSegmentTexts', () => {
  const slope = Math.tan(geometry.halfAngle);
  const blocks = layoutSegmentTexts(
    TASKS.map((task) => task.text),
    geometry,
    measure,
    { maxLines: 5, maxFontSize: 46 },
  );

  it('uses one shared, readable font size', () => {
    const sizes = new Set(blocks.map((block) => block.fontSize));
    expect(sizes.size).toBe(1);
    expect(blocks[0]?.fontSize).toBeGreaterThan(20);
    expect(blocks[0]?.fontSize).toBeLessThanOrEqual(46);
  });

  it('keeps every word of every task', () => {
    blocks.forEach((block, index) => {
      expect(block.lines.join(' ')).toBe(tokenize(TASKS[index]?.text ?? '').join(' '));
    });
  });

  it('fits every text block inside its wedge', () => {
    for (const block of blocks) {
      const lineCount = block.lines.length;
      const length = Math.max(...block.lines.map(measure)) * block.fontSize;
      const halfHeight = ((1 + geometry.lineHeight * (lineCount - 1)) * block.fontSize) / 2;
      const innerEnd = block.center - length / 2;
      const outerEnd = block.center + length / 2;

      expect(innerEnd).toBeGreaterThanOrEqual(geometry.innerRadius - 1e-6);
      expect(outerEnd).toBeLessThanOrEqual(geometry.outerRadius + 1e-6);
      // The narrow, inner end of the wedge must be wide enough for all lines.
      expect(halfHeight).toBeLessThanOrEqual(innerEnd * slope - geometry.padding + 1e-6);
    }
  });
});
