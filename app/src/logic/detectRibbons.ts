import { ProcessingOptions } from "@data/ProcessingOptions";
import { Slice } from "@data/shapes";
import {
  DirectSearchOptimization,
  findConnectedTrapezoids,
  getPointsOnTrapezoid,
  getSquare,
  RANSAC,
  translateTrapezoid,
} from "@logic/canvas";
import { orderTrapezoids } from "@logic/trapezoids/connected";
import { detectTrapezoid } from "@logic/trapezoids/detection";
import { trapezoidIsValid } from "@logic/trapezoids/valid";

export const detectRibbons = async ({
  point: [imgX, imgY],
  edgeDataCanvasRef,
  overlayCanvasRef,
  options,
}: {
  point: [number, number];
  edgeDataCanvasRef: HTMLCanvasElement;
  overlayCanvasRef: HTMLCanvasElement;
  options: ProcessingOptions;
}): Promise<Slice[]> => {
  console.log("findTrapezoid");
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
    overlayCanvasRef.getContext("2d")!,
    options
  );
  // return trapezoid ? ([{ ...trapezoid, id: 0 }] as Slice[]) : [];
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
    if (!trapezoid) return [];
    trapezoid = translateTrapezoid(
      trapezoid,
      imgX - options.squareSize / 2,
      imgY - options.squareSize / 2
    );
    const { trapezoid: newTrapezoid, fit: f } = DirectSearchOptimization(
      getPointsOnTrapezoid,
      trapezoid,
      square,
      options,
      imgX,
      imgY
    );
    fit = f;
    trapezoid = newTrapezoid;
  }
  if (!trapezoid) return [];
  // trapezoid = permuteTrapezoid(trapezoid);
  const connectedTrapezoids = findConnectedTrapezoids(
    trapezoid,
    edgeData,
    overlayCanvasRef.getContext("2d")!,
    imgX,
    imgY,
    options,
    fit ?? 1
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
