"use client";

import { useEffect, useRef, useState } from "react";
import { renderFractal, type FractalOpts } from "./fractal";

/* ----------------------------------------------------------------
   Single lazy Worker + in-memory / sessionStorage cache
   ---------------------------------------------------------------- */

let worker: Worker | null = null;
let workerSupported: boolean | null = null;
let reqId = 0;
const pending = new Map<
  number,
  { resolve: (url: string) => void; reject: (err: unknown) => void }
>();
const memCache = new Map<string, string>();

function cacheKey(size: number, opts: FractalOpts): string {
  return `fractal:${size}:${JSON.stringify(opts)}`;
}

function readSessionCache(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionCache(key: string, dataUrl: string): void {
  try {
    sessionStorage.setItem(key, dataUrl);
  } catch {
    /* quota exceeded - ignore */
  }
}

function ensureWorker(): Worker | null {
  if (workerSupported === false) return null;
  if (worker) return worker;
  try {
    if (
      typeof Worker === "undefined" ||
      typeof OffscreenCanvas === "undefined"
    ) {
      workerSupported = false;
      return null;
    }
    worker = new Worker(
      new URL("../workers/fractal.worker.ts", import.meta.url),
    );
    worker.onmessage = (e: MessageEvent) => {
      const { id, dataUrl } = e.data;
      const p = pending.get(id);
      if (p) {
        pending.delete(id);
        p.resolve(dataUrl);
      }
    };
    workerSupported = true;
    return worker;
  } catch {
    workerSupported = false;
    return null;
  }
}

/** Main-thread fallback when Worker/OffscreenCanvas is absent. */
function renderOnMain(size: number, opts: FractalOpts): string {
  const px = renderFractal(size, opts);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const imgData = ctx.createImageData(size, size);
  imgData.data.set(px);
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL();
}

/**
 * Get a fractal data-URL for given size and opts.
 * Uses Worker when available, falls back to main thread.
 * Results are cached in memory + sessionStorage.
 */
export function getFractal(size: number, opts: FractalOpts): Promise<string> {
  const key = cacheKey(size, opts);

  // 1. Memory cache
  const mem = memCache.get(key);
  if (mem) return Promise.resolve(mem);

  // 2. Session cache
  const ses = readSessionCache(key);
  if (ses) {
    memCache.set(key, ses);
    return Promise.resolve(ses);
  }

  // 3. Worker path
  const w = ensureWorker();
  if (w) {
    const id = ++reqId;
    return new Promise<string>((resolve, reject) => {
      pending.set(id, {
        resolve(url: string) {
          memCache.set(key, url);
          writeSessionCache(key, url);
          resolve(url);
        },
        reject,
      });
      w.postMessage({ id, size, opts });
    });
  }

  // 4. Main-thread fallback
  try {
    const url = renderOnMain(size, opts);
    memCache.set(key, url);
    writeSessionCache(key, url);
    return Promise.resolve(url);
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * React hook: lazily renders a fractal when the element enters the viewport.
 * Returns a ref to attach to the wrapper and the generated data URL.
 */
export function useFractal(
  opts: FractalOpts,
  size: number,
): { ref: React.RefObject<HTMLElement | null>; dataUrl: string | null } {
  const ref = useRef<HTMLElement | null>(null);
  const [dataUrl, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([en]) => {
        if (en.isIntersecting) {
          io.disconnect();
          getFractal(size, opts).then(setUrl);
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, JSON.stringify(opts)]);

  return { ref, dataUrl };
}
