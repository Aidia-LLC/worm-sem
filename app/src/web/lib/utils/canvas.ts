import { base64ToImageSrc } from "./base64ToImageSrc";

export const setupCanvases = async (details: {
  primaryCanvas: HTMLCanvasElement;
  canvases: HTMLCanvasElement[];
  src: string;
}): Promise<{
  width: number;
  height: number;
}> => {
  return new Promise((res) => {
    const image = new Image();
    image.onload = () => {
      const ctx = details.primaryCanvas.getContext("2d")!;
      ctx.clearRect(
        0,
        0,
        details.primaryCanvas.width,
        details.primaryCanvas.height
      );
      details.primaryCanvas.width = image.width;
      details.primaryCanvas.height = image.height;
      ctx.drawImage(image, 0, 0);
      details.canvases.forEach((canvas) => {
        canvas.width = image.width;
        canvas.height = image.height;
      });
      res({
        width: image.width,
        height: image.height,
      });
    };
    image.src = base64ToImageSrc(details.src);
  });
};
