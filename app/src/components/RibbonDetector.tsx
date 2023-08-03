import {
  DirectSearchOptimization,
  findConnectedTrapezoids,
  getPointsOnTrapezoid,
  getSquare,
  permuteTrapezoid,
  RANSAC,
  translateTrapezoid,
} from "@logic/canvas";
import { orderTrapezoids } from "@logic/trapezoids/connected";
import { detectTrapezoid } from "@logic/trapezoids/detection";
import { trapezoidIsValid } from "@logic/trapezoids/valid";
import { ProcessingOptions } from "src/types/ProcessingOptions";

export const RibbonDetector = async ({
  point: [imgX, imgY],
  edgeDataCanvasRef,
  options,
}: {
  point: [number, number];
  edgeDataCanvasRef: HTMLCanvasElement;
  options: ProcessingOptions;
}) => {
  const edgeContext = edgeDataCanvasRef.getContext("2d")!;
  const edgeData = edgeContext.getImageData(
    0,
    0,
    edgeDataCanvasRef.width,
    edgeDataCanvasRef.height
  );
  let { trapezoid, fit } = detectTrapezoid(
    imgX,
    imgY,
    edgeData,
    // canvasRef.getContext("2d")!,
    options
  );
  console.log("trapezoid", trapezoid);
  const valid =
    trapezoid && trapezoidIsValid(trapezoid, imgX, imgY, options, fit);
  console.log("valid", valid);
  if (!valid) {
    const square = getSquare(edgeData, imgX, imgY, options.squareSize);
    trapezoid = RANSAC(
      square,
      0,
      options,
      imgX - options.squareSize / 2,
      imgY - options.squareSize / 2
    )!;
    console.log("trapezoid ransac", trapezoid);
    if (!trapezoid) return;
    trapezoid = translateTrapezoid(
      trapezoid,
      imgX - options.squareSize / 2,
      imgY - options.squareSize / 2
    );
    const { trapezoid: newTrapezoid } = DirectSearchOptimization(
      getPointsOnTrapezoid,
      trapezoid,
      square,
      options,
      imgX - options.squareSize / 2,
      imgY - options.squareSize / 2
    );
    trapezoid = newTrapezoid;
  }
  if (!trapezoid) return;
  trapezoid = permuteTrapezoid(trapezoid);
  const connectedTrapezoids = findConnectedTrapezoids(
    trapezoid,
    edgeContext,
    imgX,
    imgY,
    options,
    options.minimumFit
  );
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