import { layoutSegmentTexts, type Measure } from './layout';
import type { Task } from './tasks';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Font used for the segment texts (must match the CSS). */
export const WHEEL_FONT = '"Fredoka Variable", "Fredoka", "Trebuchet MS", sans-serif';
export const WHEEL_FONT_WEIGHT = 600;

/** Wheel geometry in SVG user units; the viewBox spans -500…500. */
const GEOMETRY = {
  rimRadius: 496,
  segmentRadius: 456,
  lightRadius: 476,
  lightCount: 24,
  lightSize: 8,
  hubRadius: 58,
  emojiRadius: 110,
  emojiSize: 52,
  text: { innerRadius: 148, outerRadius: 438, padding: 8, lineHeight: 1.1 },
  maxLines: 5,
  maxFontSize: 46,
} as const;

export interface RenderedWheel {
  readonly svg: SVGSVGElement;
  /** One group per task, in the same order as the tasks. */
  readonly segments: readonly SVGGElement[];
}

type Attributes = Record<string, string | number>;

function svgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Attributes,
  parent?: Element,
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
  parent?.append(element);
  return element;
}

const round = (value: number): number => Math.round(value * 100) / 100;

/** Point at `radius` and clockwise angle `degrees` (0° = 12 o'clock). */
function polar(radius: number, degrees: number): [number, number] {
  const radians = (degrees * Math.PI) / 180;
  return [round(radius * Math.sin(radians)), round(-radius * Math.cos(radians))];
}

function wedgePath(radius: number, startDegrees: number, endDegrees: number): string {
  const [x0, y0] = polar(radius, startDegrees);
  const [x1, y1] = polar(radius, endDegrees);
  const largeArc = endDegrees - startDegrees > 180 ? 1 : 0;
  return `M 0 0 L ${x0} ${y0} A ${radius} ${radius} 0 ${largeArc} 1 ${x1} ${y1} Z`;
}

/** Measures text with a canvas using the wheel font, normalised to font size 1. */
export function createCanvasMeasure(): Measure {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return (text) => text.length * 0.55;
  context.font = `${WHEEL_FONT_WEIGHT} 100px ${WHEEL_FONT}`;
  return (text) => context.measureText(text).width / 100;
}

/** Builds the wheel as an SVG: coloured segments, texts, emojis, rim lights and hub. */
export function renderWheel(tasks: readonly Task[], measure: Measure): RenderedWheel {
  const svg = svgElement('svg', {
    viewBox: '-500 -500 1000 1000',
    class: 'wheel-svg',
    'aria-hidden': 'true',
    focusable: 'false',
  });

  svgElement('circle', { r: GEOMETRY.rimRadius, class: 'wheel-rim' }, svg);
  // White base so dimmed (non-winning) segments look pale instead of dark.
  svgElement('circle', { r: GEOMETRY.segmentRadius, class: 'wheel-base' }, svg);

  const size = 360 / tasks.length;
  const layouts = layoutSegmentTexts(
    tasks.map((task) => task.text),
    { ...GEOMETRY.text, halfAngle: ((size / 2) * Math.PI) / 180 },
    measure,
    { maxLines: GEOMETRY.maxLines, maxFontSize: GEOMETRY.maxFontSize },
  );

  const segments = tasks.map((task, index) => {
    const group = svgElement('g', { class: 'segment' }, svg);
    svgElement(
      'path',
      { d: wedgePath(GEOMETRY.segmentRadius, index * size, (index + 1) * size), fill: task.color, class: 'segment-bg' },
      group,
    );

    // Rotate a local frame so its +x axis points from the centre through the
    // middle of the segment; texts then simply run along x.
    const content = svgElement('g', { transform: `rotate(${round((index + 0.5) * size - 90)})` }, group);

    const layout = layouts[index];
    if (layout) {
      const lineCount = layout.lines.length;
      layout.lines.forEach((line, lineIndex) => {
        const y = (lineIndex - (lineCount - 1) / 2) * GEOMETRY.text.lineHeight * layout.fontSize;
        const text = svgElement(
          'text',
          {
            x: round(layout.center),
            y: round(y),
            'font-size': round(layout.fontSize),
            'text-anchor': 'middle',
            'dominant-baseline': 'central',
            class: 'segment-text',
          },
          content,
        );
        text.textContent = line;
      });
    }

    // Emoji near the hub, turned so it stands upright when its segment is at the top.
    const emoji = svgElement(
      'text',
      {
        x: GEOMETRY.emojiRadius,
        y: 0,
        'font-size': GEOMETRY.emojiSize,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        transform: `rotate(90 ${GEOMETRY.emojiRadius} 0)`,
        class: 'segment-emoji',
      },
      content,
    );
    emoji.textContent = task.emoji;

    return group;
  });

  for (let index = 0; index < tasks.length; index++) {
    const [x, y] = polar(GEOMETRY.segmentRadius, index * size);
    svgElement('line', { x1: 0, y1: 0, x2: x, y2: y, class: 'segment-divider' }, svg);
  }

  for (let index = 0; index < GEOMETRY.lightCount; index++) {
    const [cx, cy] = polar(GEOMETRY.lightRadius, (index + 0.5) * (360 / GEOMETRY.lightCount));
    svgElement('circle', { cx, cy, r: GEOMETRY.lightSize, class: index % 2 ? 'light light-alt' : 'light' }, svg);
  }

  svgElement('circle', { r: GEOMETRY.hubRadius + 12, class: 'hub-ring' }, svg);
  svgElement('circle', { r: GEOMETRY.hubRadius, class: 'hub' }, svg);
  const star = svgElement(
    'text',
    { x: 0, y: 0, 'font-size': 56, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'hub-star' },
    svg,
  );
  star.textContent = '⭐';

  return { svg, segments };
}
