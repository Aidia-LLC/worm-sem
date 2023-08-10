import { Mask } from "src/lib/data/mask";
import { PYTHON_PORT } from "../../config";

export const segmentImage = async ({
  filename,
  points,
  canvasRef,
}: {
  filename: string;
  points: Array<[number, number]>;
  canvasRef: HTMLCanvasElement;
}) => {
  const res = await fetch(`http://127.0.0.1:${PYTHON_PORT}/segment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename,
      points,
    }),
  });
  const data = (await res.json()) as {
    success: boolean;
    masks: Mask[];
  };
  const ctx = canvasRef.getContext("2d")!;
  const masks = data.masks.map((mask) => maskToImageData(mask, ctx, canvasRef));
  if (masks.length === 0) return [];
  if (masks.length === 3) return [masks[1], masks[0], masks[2]]; // put them in order of good to bad
  return masks;
};

const maskToImageData = (
  mask: Mask,
  ctx: CanvasRenderingContext2D,
  canvasRef: HTMLCanvasElement
) => {
  const maskImageData = ctx.createImageData(canvasRef.width, canvasRef.height);
  for (let i = 0; i < maskImageData.data.length; i += 4) {
    const x = (i / 4) % canvasRef.width;
    const y = Math.floor(i / 4 / canvasRef.width);
    const inMask = mask[y][x];
    maskImageData.data[i] = inMask ? 255 : 0;
    maskImageData.data[i + 1] = inMask ? 255 : 0;
    maskImageData.data[i + 2] = inMask ? 255 : 0;
    maskImageData.data[i + 3] = 255;
  }
  return maskImageData;
};
