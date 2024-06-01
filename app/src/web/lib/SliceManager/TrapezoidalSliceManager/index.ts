import { GeneticAlgorithm } from "@components/GeneticAlgorithm";
import { Template } from "@data/templates";
import { SliceManager } from "../SliceManager";
import { Shape, ShapeSet } from "../types";
import { addTrapezoid } from "./functions/addTrapezoid";
import { distanceSegmentToPoint } from "./functions/distanceSegmentToPoint";
import { drawTrapezoid } from "./functions/drawTrapezoid";
import { findContainingSlice } from "./functions/findContainingSlice";
import { findCorners } from "./functions/findCorners";
import { findNearestVertex } from "./functions/findNearestVertex";
import { getValidSlices } from "./functions/getValidSlices";
import { isOutOfBounds } from "./functions/isOutOfBounds";
import { matchPoints } from "./functions/matchPoints";
import { matchPointsFromTemplate } from "./functions/matchPointsFromTemplate";
import { translateSlice } from "./functions/translateSlice";
import { translateSliceVertex } from "./functions/translateSliceVertex";
import {
  Line,
  Point,
  TrapezoidalShapeSet,
  TrapezoidalSlice,
  Vertex,
} from "./types";

export class TrapezoidalSliceManager extends SliceManager {
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

  override matchPointsFromTemplate(details: {
    ribbon: ShapeSet;
    template: Template;
  }) {
    return matchPointsFromTemplate(details);
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

  override findCorners(details: {
    imageData: ImageData;
    imageContext: CanvasRenderingContext2D;
  }): {
    corners: [number, number][];
    imageData: ImageData;
  } {
    return findCorners(details);
  }

  override getValidSlices(points: Point[]): Line[][] {
    return getValidSlices(points);
  }

  override geneticAlgorithm(slices: Shape[], edgeData: ImageData): Shape[] {
    return GeneticAlgorithm(slices, edgeData);
  }

  override distanceSegmentToPoint(A: Vertex, B: Vertex, C: Vertex): number {
    return distanceSegmentToPoint(A, B, C);
  }
}
