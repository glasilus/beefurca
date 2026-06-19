import { renderFractal } from "../lib/fractal";

self.onmessage = (e: MessageEvent) => {
  const { id, size, opts } = e.data;
  const px = renderFractal(size, opts);
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d")!;
  const imgData = ctx.createImageData(size, size);
  imgData.data.set(px);
  ctx.putImageData(imgData, 0, 0);
  canvas.convertToBlob().then((b) => {
    const reader = new FileReader();
    reader.onload = () =>
      (self as unknown as Worker).postMessage({ id, dataUrl: reader.result });
    reader.readAsDataURL(b);
  });
};
