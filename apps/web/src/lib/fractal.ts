/**
 * Pure deterministic fractal generator (no DOM).
 * Julia set from hash, v1 math from design-preview.html.
 */

export function hashSeed(seed: string): number {
  let h = 2166136261;
  const s = seed || "beefurca";
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function hsl2rgb(
  h: number,
  s: number,
  l: number,
): [number, number, number] {
  h = (((h % 360) + 360) % 360) / 360;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return Math.round(
      255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))),
    );
  };
  return [f(0), f(8), f(4)];
}

export function juliaParams(h: number): {
  cre: number;
  cim: number;
  hueBase: number;
} {
  return {
    cre: -0.8 + ((h & 0xffff) / 0xffff) * 1.2 - 0.6,
    cim: -0.2 + (((h >> 16) & 0xffff) / 0xffff) * 0.8 - 0.4,
    hueBase: h % 360,
  };
}

export interface FractalOpts {
  seed?: string;
  cre?: number;
  cim?: number;
  hue?: number;
  span?: number;
  lift?: number;
}

export function renderFractal(
  size: number,
  opts: FractalOpts = {},
): Uint8ClampedArray {
  const h = hashSeed(opts.seed ?? "beefurca");
  const base = juliaParams(h);
  const cre = opts.cre ?? base.cre;
  const cim = opts.cim ?? base.cim;
  const hueBase = opts.hue ?? base.hueBase;
  const span = opts.span ?? 330;
  const lift = opts.lift ?? 0.2;
  const W = size;
  const H = size;
  const out = new Uint8ClampedArray(W * H * 4);
  const maxIter = 60;
  const zoom = 1.35;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let zx = ((x - W / 2) / (0.5 * zoom * W)) * 1.6;
      let zy = ((y - H / 2) / (0.5 * zoom * H)) * 1.6;
      let i = 0;
      while (zx * zx + zy * zy < 4 && i < maxIter) {
        const xt = zx * zx - zy * zy + cre;
        zy = 2 * zx * zy + cim;
        zx = xt;
        i++;
      }
      const p = (y * W + x) * 4;
      if (i === maxIter) {
        out[p] = 8;
        out[p + 1] = 10;
        out[p + 2] = 18;
        out[p + 3] = 255;
      } else {
        const t = i / maxIter;
        const hue = (hueBase + t * span) % 360;
        const [r, g, b] = hsl2rgb(hue, 0.95, Math.min(lift + t * 0.58, 0.82));
        out[p] = r;
        out[p + 1] = g;
        out[p + 2] = b;
        out[p + 3] = 255;
      }
    }
  }
  return out;
}
