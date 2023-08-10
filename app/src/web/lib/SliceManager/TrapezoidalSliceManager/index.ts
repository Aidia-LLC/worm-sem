import { ProcessingOptions } from "@data/ProcessingOptions";
import { SliceManager } from "../SliceManager";
import { ShapeSet } from "../types";
import { addTrapezoid } from "./functions/addTrapezoid";
import { detectRibbons } from "./functions/detectRibbons";
import { drawTrapezoid } from "./functions/drawTrapezoid";
import { findContainingSlice } from "./functions/findContainingSlice";
import { findNearestVertex } from "./functions/findNearestVertex";
import { isOutOfBounds } from "./functions/isOutOfBounds";
import { matchPoints } from "./functions/matchPoints";
import { translateSlice } from "./functions/translateSlice";
import { translateSliceVertex } from "./functions/translateSliceVertex";
import { TrapezoidalShapeSet, TrapezoidalSlice } from "./types";

export class TrapezoidalSliceManager extends SliceManager {
  override async detectRibbon(details: {
    referencePoint: [number, number];
    options: ProcessingOptions;
    edgeDataCanvas: HTMLCanvasElement;
    debugCanvas?: HTMLCanvasElement;
  }): Promise<TrapezoidalSlice[]> {
    return detectRibbons({
      point: details.referencePoint,
      edgeDataCanvasRef: details.edgeDataCanvas,
      overlayCanvasRef: details.debugCanvas,
      options: details.options,
    });
  }

  override translateSlice(details: {
    slice: TrapezoidalSlice;
    dx: number;
    dy: number;
  }): TrapezoidalSlice {
    return translateSlice(details);
  }

  override matchPoints(details: {
    point: [number, number];
    ribbon: ShapeSet;
    slice: TrapezoidalSlice;
  }) {
    return matchPoints(details);
  }

  override findContainingSlice(details: {
    point: [number, number];
    sets: ShapeSet[];
  }): { set: ShapeSet; slice: TrapezoidalSlice } | null {
    return findContainingSlice(details);
  }

  override isOutOfBounds(details: {
    shape: TrapezoidalSlice;
    canvas: { width: number; height: number };
  }): boolean {
    return isOutOfBounds(details);
  }

  override translateSliceVertex(details: {
    slice: TrapezoidalSlice;
    position: string;
    dx: number;
    dy: number;
  }): TrapezoidalSlice {
    return translateSliceVertex(details);
  }

  override drawShape(details: {
    shape: TrapezoidalSlice;
    ctx: CanvasRenderingContext2D;
    color: string;
    thickness: number;
  }): void {
    return drawTrapezoid(details);
  }

  override findNearestVertex(details: {
    point: [number, number];
    shapeSets: TrapezoidalShapeSet[];
  }) {
    return findNearestVertex(details);
  }

  override addSlice(details: {
    top: boolean;
    shapes: TrapezoidalSlice[];
    id: number;
  }): TrapezoidalSlice[] {
    return addTrapezoid(details);
  }
}
