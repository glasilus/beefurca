import { test } from "node:test";
import assert from "node:assert/strict";
import { hashSeed, juliaParams, renderFractal, hsl2rgb } from "./fractal.ts";

test("hashSeed is deterministic", () => {
  assert.equal(hashSeed("beefurca"), hashSeed("beefurca"));
  assert.notEqual(hashSeed("a"), hashSeed("b"));
});

test("juliaParams within expected ranges", () => {
  const p = juliaParams(hashSeed("chess-pro"));
  assert.ok(p.cre >= -1.4 && p.cre <= -0.2, `cre=${p.cre} out of range`);
  assert.ok(p.cim >= -0.6 && p.cim <= 0.2, `cim=${p.cim} out of range`);
});

test("renderFractal returns RGBA of correct length and is not solid black", () => {
  const px = renderFractal(32, { seed: "chess-pro" });
  assert.equal(px.length, 32 * 32 * 4);
  let bright = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i] + px[i + 1] + px[i + 2] > 120) bright++;
  }
  assert.ok(bright > 50, "should have bright colored pixels");
});

test("hsl2rgb basic colors", () => {
  assert.deepEqual(hsl2rgb(0, 1, 0.5), [255, 0, 0]);
});
