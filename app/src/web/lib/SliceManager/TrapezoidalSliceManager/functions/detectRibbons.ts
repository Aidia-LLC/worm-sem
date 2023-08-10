import { ProcessingOptions } from "@data/ProcessingOptions";
import { validateTrapezoid } from "@SliceManager/TrapezoidalSliceManager/functions/validateTrapezoid";
import { TrapezoidalSlice } from "../types";
import { detectTrapezoid } from "./detectTrapezoid";
import { directSearchOptimization } from "./directSearchOptimization";
import { findConnectedTrapezoids } from "./findConnectedTrapezoids";
import { getPointsOnTrapezoid } from "./getPointsOnTrapezoid";
import { getSquare } from "./getSquare";
import { orderTrapezoids } from "./orderTrapezoid";
import { permuteTrapezoid } from "./permuteTrapezoid";
import { ransac } from "./ransac";
import { translateSlice } from "./translateSlice";

export const detectRibbons = async ({
  point: [imgX, imgY],
  edgeDataCanvasRef,
  overlayCanvasRef,
  options,
}: {
  point: [number, number];
  edgeDataCanvasRef: HTMLCanvasElement;
  overlayCanvasRef?: HTMLCanvasElement;
  options: ProcessingOptions;
}): Promise<TrapezoidalSlice[]> => {
  const edgeContext = edgeDataCanvasRef.getContext("2d")!;
  const edgeData = edgeContext.getImageData(
    0,
    0,
    edgeDataCanvasRef.width,
    edgeDataCanvasRef.height
  );
  let { trapezoid, fit, vertices } = detectTrapezoid({
    x: imgX,
    y: imgY,
    imageData: edgeData,
    options,
    ctx: overlayCanvasRef?.getContext("2d"),
  });
  const valid =
    trapezoid &&
    validateTrapezoid({
      trapezoid,
      x: imgX,
      y: imgY,
      options,
      fit,
    });
  console.log("valid", valid);
  if (!valid) {
    const square = getSquare(edgeData, imgX, imgY, options.squareSize);
    trapezoid = ransac(
      square,
      0,
      options,
      imgX - options.squareSize / 2,
      imgY - options.squareSize / 2,
      options.squareSize,
      vertices?.map((v) => ({
        x: v.x - (imgX - options.squareSize / 2),
        y: v.y - (imgY - options.squareSize / 2),
      }))
    )!;
    console.log("trapezoid ransac", trapezoid);
    if (!trapezoid) return [];
    trapezoid = translateSlice({
      slice: trapezoid,
      dx: imgX - options.squareSize / 2,
      dy: imgY - options.squareSize / 2,
    });
    const { trapezoid: newTrapezoid, fit: f } = directSearchOptimization({
      optimizationFn: getPointsOnTrapezoid,
      trapezoid,
      data: square,
      options,
      x: imgX,
      y: imgY,
    });
    fit = f;
    trapezoid = permuteTrapezoid(newTrapezoid);
  }
  if (!trapezoid) return [];
  const connectedTrapezoids = findConnectedTrapezoids({
    trapezoid,
    edgeData,
    ctx: edgeDataCanvasRef.getContext("2d")!,
    x: imgX,
    y: imgY,
    options,
    fit: fit ?? 1,
  });
  const trapezoids = orderTrapezoids(
    [trapezoid, ...connectedTrapezoids].filter((t) => {
      const x = [
        t.bottom.x1,
        t.bottom.x2,
        t.left.x1,
        t.left.x2,
        t.right.x1,
        t.right.x2,
        t.top.x1,
        t.top.x2,
      ];
      const y = [
        t.bottom.y1,
        t.bottom.y2,
        t.left.y1,
        t.left.y2,
        t.right.y1,
        t.right.y2,
        t.top.y1,
        t.top.y2,
      ];
      return (
        x.every((x) => x >= 0 && x < edgeData.width) &&
        y.every((y) => y >= 0 && y < edgeData.height)
      );
    })
  );
  return trapezoids;
};
