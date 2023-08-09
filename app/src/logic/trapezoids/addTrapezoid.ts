import { ProcessingOptions } from "@data/ProcessingOptions";
import { RibbonData, Slice } from "@data/shapes";
import {
  DirectSearchOptimization,
  DrawTrapezoid,
  getPointsOnTrapezoid,
  getSquare,
  getXYShift,
} from "@logic/canvas";

export const addTrapezoid = ({
  trapezoids,
  id,
  top = false,
  edgeDataCanvasRef,
  overlayCanvasRef,
  imgX,
  imgY,
  options,
}: {
  trapezoids: RibbonData["slices"];
  id: number;
  top: boolean;
  edgeDataCanvasRef: HTMLCanvasElement;
  overlayCanvasRef: HTMLCanvasElement;
  imgX: number;
  imgY: number;
  options: ProcessingOptions;
}): Slice[] => {
  console.log("addTrapezoid here");
  const edgeData = edgeDataCanvasRef
    .getContext("2d")!
    .getImageData(0, 0, edgeDataCanvasRef.width, edgeDataCanvasRef.height);
  if (trapezoids.length === 1) {
    const { xShift, yShift } = getXYShift(trapezoids[0]);
    const dx = top ? -xShift : xShift;
    const dy = top ? -yShift : yShift;
    const square = getSquare(
      edgeData,
      imgX + dx,
      imgY + dy,
      options.squareSize
    );
    const ctx = overlayCanvasRef.getContext("2d")!;
    ctx.beginPath();
    ctx.lineWidth = 8;
    ctx.rect(
      imgX + dx - options.squareSize / 2,
      imgY + dy - options.squareSize / 2,
      options.squareSize,
      options.squareSize
    );
    ctx.strokeStyle = "blue";
    ctx.stroke();
    ctx.closePath();
    const trapezoid = {
      id,
      top: {
        x1: trapezoids[0].top.x1 + dx,
        x2: trapezoids[0].top.x2 + dx,
        y1: trapezoids[0].top.y1 + dy,
        y2: trapezoids[0].top.y2 + dy,
      },
      bottom: {
        x1: trapezoids[0].bottom.x1 + dx,
        x2: trapezoids[0].bottom.x2 + dx,
        y1: trapezoids[0].bottom.y1 + dy,
        y2: trapezoids[0].bottom.y2 + dy,
      },
      left: {
        x1: trapezoids[0].left.x1 + dx,
        x2: trapezoids[0].left.x2 + dx,
        y1: trapezoids[0].left.y1 + dy,
        y2: trapezoids[0].left.y2 + dy,
      },
      right: {
        x1: trapezoids[0].right.x1 + dx,
        x2: trapezoids[0].right.x2 + dx,
        y1: trapezoids[0].right.y1 + dy,
        y2: trapezoids[0].right.y2 + dy,
      },
    };
    const { fit: _, trapezoid: newTrapezoid } = DirectSearchOptimization(
      getPointsOnTrapezoid,
      trapezoid,
      square,
      options,
      imgX + dx,
      imgY + dy
    );
    const slice = {
      ...newTrapezoid,
      id,
    } as Slice;
    return [...(top ? [] : trapezoids), slice, ...(top ? trapezoids : [])];
  }

  // insert and identical trapezoid to either the beginning or end of the array
  const newTrapezoidSet = [...trapezoids];
  if (top) {
    const newTrapezoid = trapezoids[0];
    const referenceTrapezoid = trapezoids[1];
    const topTrapezoid: Slice = {
      id,
      top: {
        x1:
          newTrapezoid.top.x1 +
          (newTrapezoid.top.x1 - referenceTrapezoid.top.x1),
        x2:
          newTrapezoid.top.x2 +
          (newTrapezoid.top.x2 - referenceTrapezoid.top.x2),
        y1:
          newTrapezoid.top.y1 +
          (newTrapezoid.top.y1 - referenceTrapezoid.top.y1),
        y2:
          newTrapezoid.top.y2 +
          (newTrapezoid.top.y2 - referenceTrapezoid.top.y2),
      },
      bottom: {
        x1:
          newTrapezoid.bottom.x1 +
          (newTrapezoid.bottom.x1 - referenceTrapezoid.bottom.x1),
        x2:
          newTrapezoid.bottom.x2 +
          (newTrapezoid.bottom.x2 - referenceTrapezoid.bottom.x2),
        y1:
          newTrapezoid.bottom.y1 +
          (newTrapezoid.bottom.y1 - referenceTrapezoid.bottom.y1),
        y2:
          newTrapezoid.bottom.y2 +
          (newTrapezoid.bottom.y2 - referenceTrapezoid.bottom.y2),
      },
      left: {
        x1:
          newTrapezoid.left.x1 +
          (newTrapezoid.left.x1 - referenceTrapezoid.left.x1),
        x2:
          newTrapezoid.left.x2 +
          (newTrapezoid.left.x2 - referenceTrapezoid.left.x2),
        y1:
          newTrapezoid.left.y1 +
          (newTrapezoid.left.y1 - referenceTrapezoid.left.y1),
        y2:
          newTrapezoid.left.y2 +
          (newTrapezoid.left.y2 - referenceTrapezoid.left.y2),
      },
      right: {
        x1:
          newTrapezoid.right.x1 +
          (newTrapezoid.right.x1 - referenceTrapezoid.right.x1),
        x2:
          newTrapezoid.right.x2 +
          (newTrapezoid.right.x2 - referenceTrapezoid.right.x2),
        y1:
          newTrapezoid.right.y1 +
          (newTrapezoid.right.y1 - referenceTrapezoid.right.y1),
        y2:
          newTrapezoid.right.y2 +
          (newTrapezoid.right.y2 - referenceTrapezoid.right.y2),
      },
    };
    const dx = topTrapezoid.top.x1 - trapezoids[0].top.x1;
    const dy = topTrapezoid.top.y1 - trapezoids[0].top.y1;
    const square = getSquare(
      edgeData,
      imgX + dx,
      imgY + dy,
      options.squareSize
    );
    const ctx = overlayCanvasRef.getContext("2d")!;
    ctx.beginPath();
    ctx.lineWidth = 8;
    ctx.rect(
      imgX + dx - options.squareSize / 2,
      imgY + dy - options.squareSize / 2,
      options.squareSize,
      options.squareSize
    );
    ctx.strokeStyle = "blue";
    ctx.stroke();
    ctx.closePath();
    DrawTrapezoid(
      topTrapezoid,
      overlayCanvasRef.getContext("2d")!,
      "green",
      15
    );
    const { fit: _, trapezoid: newSlice } = DirectSearchOptimization(
      getPointsOnTrapezoid,
      topTrapezoid,
      square,
      options,
      imgX + dx,
      imgY + dy
    );
    DrawTrapezoid(newSlice, overlayCanvasRef.getContext("2d")!, "blue", 10);
    const slice = {
      ...newSlice,
      id,
    } as Slice;
    newTrapezoidSet.unshift(slice);
  } else {
    const newTrapezoid = trapezoids[trapezoids.length - 1];
    const referenceTrapezoid = trapezoids[trapezoids.length - 2];
    const bottomTrapezoid: Slice = {
      id,
      top: {
        x1:
          newTrapezoid.top.x1 +
          (newTrapezoid.top.x1 - referenceTrapezoid.top.x1),
        x2:
          newTrapezoid.top.x2 +
          (newTrapezoid.top.x2 - referenceTrapezoid.top.x2),
        y1:
          newTrapezoid.top.y1 +
          (newTrapezoid.top.y1 - referenceTrapezoid.top.y1),
        y2:
          newTrapezoid.top.y2 +
          (newTrapezoid.top.y2 - referenceTrapezoid.top.y2),
      },
      bottom: {
        x1:
          newTrapezoid.bottom.x1 +
          (newTrapezoid.bottom.x1 - referenceTrapezoid.bottom.x1),
        x2:
          newTrapezoid.bottom.x2 +
          (newTrapezoid.bottom.x2 - referenceTrapezoid.bottom.x2),
        y1:
          newTrapezoid.bottom.y1 +
          (newTrapezoid.bottom.y1 - referenceTrapezoid.bottom.y1),
        y2:
          newTrapezoid.bottom.y2 +
          (newTrapezoid.bottom.y2 - referenceTrapezoid.bottom.y2),
      },
      left: {
        x1:
          newTrapezoid.left.x1 +
          (newTrapezoid.left.x1 - referenceTrapezoid.left.x1),
        x2:
          newTrapezoid.left.x2 +
          (newTrapezoid.left.x2 - referenceTrapezoid.left.x2),
        y1:
          newTrapezoid.left.y1 +
          (newTrapezoid.left.y1 - referenceTrapezoid.left.y1),
        y2:
          newTrapezoid.left.y2 +
          (newTrapezoid.left.y2 - referenceTrapezoid.left.y2),
      },
      right: {
        x1:
          newTrapezoid.right.x1 +
          (newTrapezoid.right.x1 - referenceTrapezoid.right.x1),
        x2:
          newTrapezoid.right.x2 +
          (newTrapezoid.right.x2 - referenceTrapezoid.right.x2),
        y1:
          newTrapezoid.right.y1 +
          (newTrapezoid.right.y1 - referenceTrapezoid.right.y1),
        y2:
          newTrapezoid.right.y2 +
          (newTrapezoid.right.y2 - referenceTrapezoid.right.y2),
      },
    };
    const dx = bottomTrapezoid.bottom.x1 - trapezoids[0].bottom.x1;
    const dy = bottomTrapezoid.bottom.y1 - trapezoids[0].bottom.y1;
    const square = getSquare(
      edgeData,
      imgX + dx,
      imgY + dy,
      options.squareSize
    );
    const ctx = overlayCanvasRef.getContext("2d")!;
    ctx.beginPath();
    ctx.lineWidth = 8;
    ctx.rect(
      imgX + dx - options.squareSize / 2,
      imgY + dy - options.squareSize / 2,
      options.squareSize,
      options.squareSize
    );
    ctx.strokeStyle = "blue";
    ctx.stroke();
    ctx.closePath();
    DrawTrapezoid(
      bottomTrapezoid,
      overlayCanvasRef.getContext("2d")!,
      "green",
      15
    );
    const { fit: _, trapezoid: newSlice } = DirectSearchOptimization(
      getPointsOnTrapezoid,
      bottomTrapezoid,
      square,
      options,
      imgX + dx,
      imgY + dy
    );
    DrawTrapezoid(newSlice, overlayCanvasRef.getContext("2d")!, "blue", 10);
    const slice = {
      ...newSlice,
      id,
    } as Slice;
    newTrapezoidSet.push(slice);
  }
  return newTrapezoidSet;
};
