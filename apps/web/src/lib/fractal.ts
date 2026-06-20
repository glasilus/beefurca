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
  /** Optional 3-stop hex gradient (e.g. brand logo colors). Overrides HSL hue coloring. */
  palette?: [string, string, string];
  /**
   * How a `palette` is mapped onto pixels:
   *  - "escape"   (default): gradient position = fractal escape time (textured, blotchy)
   *  - "diagonal": gradient position = pixel diagonal (top-left→bottom-right),
   *                like the favicon's linear gradient; the fractal only softly
   *                modulates brightness → smooth градиент, узнаваемый как фавикон.
   */
  paletteMode?: "escape" | "diagonal";
}

function hexToRgb(hex: string): [number, number, number] {
  const s = hex.replace("#", "");
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}

/** Interpolate a 3-stop gradient at position t in [0,1]. */
function grad3(
  stops: [number, number, number][],
  t: number,
): [number, number, number] {
  const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
  const seg = t <= 0.5 ? 0 : 1;
  const u = seg === 0 ? t / 0.5 : (t - 0.5) / 0.5;
  const a = stops[seg];
  const b = stops[seg + 1];
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
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
  const stops = opts.palette
    ? (opts.palette.map(hexToRgb) as [number, number, number][])
    : null;
  const diagonal = stops != null && opts.paletteMode === "diagonal";
  // Tinted (non-black) core when a brand palette is used.
  const core: [number, number, number] = stops
    ? [
        Math.round(stops[1][0] * 0.16),
        Math.round(stops[1][1] * 0.16),
        Math.round(stops[1][2] * 0.16),
      ]
    : [8, 10, 18];
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
      if (diagonal && stops) {
        // Базовый цвет — линейный градиент по диагонали (как у фавикона),
        // фрактал лишь мягко модулирует яркость → плавный, узнаваемый градиент.
        const d = (x + y) / (W + H - 2);
        const [gr, gg, gb] = grad3(stops, d);
        const t = i / maxIter;
        // Внутри множества — заметно темнее (силуэт фрактала), снаружи —
        // лёгкая текстура в пределах ±18% яркости.
        const f = i === maxIter ? 0.42 : 0.9 + 0.32 * (t - 0.5);
        out[p] = Math.round(gr * f);
        out[p + 1] = Math.round(gg * f);
        out[p + 2] = Math.round(gb * f);
        out[p + 3] = 255;
      } else if (i === maxIter) {
        out[p] = core[0];
        out[p + 1] = core[1];
        out[p + 2] = core[2];
        out[p + 3] = 255;
      } else {
        const t = i / maxIter;
        if (stops) {
          // Brand 3-stop gradient with depth shading toward the boundary.
          const [gr, gg, gb] = grad3(stops, t);
          const f = 0.5 + 0.5 * Math.pow(t, 0.6);
          out[p] = Math.round(gr * f);
          out[p + 1] = Math.round(gg * f);
          out[p + 2] = Math.round(gb * f);
        } else {
          const hue = (hueBase + t * span) % 360;
          const [r, g, b] = hsl2rgb(hue, 0.95, Math.min(lift + t * 0.58, 0.82));
          out[p] = r;
          out[p + 1] = g;
          out[p + 2] = b;
        }
        out[p + 3] = 255;
      }
    }
  }
  return out;
}
