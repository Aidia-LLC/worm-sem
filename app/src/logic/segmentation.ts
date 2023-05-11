import { Mask } from "src/types/mask";

export const segmentImage = async ({
  filename,
  points,
  canvasRef,
}: {
  filename: string;
  points: Array<[number, number]>;
  canvasRef: HTMLCanvasElement;
}) => {
  const res = await fetch(`http://127.0.0.1:3002/segment`, {
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
  console.log(data);
  const ctx = canvasRef.getContext("2d")!;
  return data.masks.map((mask) => maskToImageData(mask, ctx, canvasRef));
};

const maskToImageData = (
  mask: Mask,
  ctx: CanvasRenderingContext2D,
  canvasRef: HTMLCanvasElement
) => {
  console.log("mask", mask);
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
