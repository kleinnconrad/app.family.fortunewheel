/** Lightweight canvas confetti burst – no dependencies. */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  size: number;
  color: string;
  round: boolean;
}

const COLORS = ['#ff4d6d', '#ffd84d', '#4dabf7', '#69db7c', '#b197fc', '#ffa94d', '#ffffff'];
const GRAVITY = 0.32;

let particles: Particle[] = [];
let frameRequest: number | null = null;

function resize(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): void {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(window.innerWidth * ratio);
  const height = Math.round(window.innerHeight * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

export interface Burst {
  /** Viewport position the confetti starts from. */
  readonly x: number;
  readonly y: number;
  /** Launch direction in degrees: 0 = straight up, positive = to the right. */
  readonly direction: number;
  /** Total spread of launch angles in degrees. */
  readonly spread: number;
  readonly amount: number;
}

function addParticles({ x, y, direction, spread, amount }: Burst): void {
  for (let i = 0; i < amount; i++) {
    const angle = ((direction + (Math.random() - 0.5) * spread - 90) * Math.PI) / 180;
    const speed = 12 + Math.random() * 12;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.35,
      size: 6 + Math.random() * 7,
      color: COLORS[i % COLORS.length] ?? '#ffffff',
      round: Math.random() < 0.3,
    });
  }
}

/** Fires one or more confetti bursts and animates them until they fall off screen. */
export function launchConfetti(canvas: HTMLCanvasElement, bursts: readonly Burst[]): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  bursts.forEach(addParticles);
  if (frameRequest !== null) return;

  let last = performance.now();
  const frame = (now: number): void => {
    // Normalise to 60 fps so the motion looks the same on 120 Hz screens.
    const step = Math.min(3, (now - last) / (1000 / 60));
    last = now;
    resize(canvas, context);
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (const p of particles) {
      p.vy += GRAVITY * step;
      p.vx *= 0.99 ** step;
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.rotation += p.spin * step;
      context.save();
      context.translate(p.x, p.y);
      context.rotate(p.rotation);
      context.fillStyle = p.color;
      if (p.round) {
        context.beginPath();
        context.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        context.fill();
      } else {
        context.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      context.restore();
    }

    particles = particles.filter((p) => p.y < window.innerHeight + 40);
    if (particles.length > 0) {
      frameRequest = requestAnimationFrame(frame);
    } else {
      frameRequest = null;
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  };
  frameRequest = requestAnimationFrame(frame);
}
