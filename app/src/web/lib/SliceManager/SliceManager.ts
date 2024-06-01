import { Template } from "@data/templates";
import { Line, Point, Vertex } from "./TrapezoidalSliceManager/types";
import { Shape, ShapeSet } from "./types";

export abstract class SliceManager {
  abstract translateSlice(details: {
    slice: Shape;
    dx: number;
    dy: number;
  }): Shape;

  abstract translateSliceVertex(details: {
    slice: Shape;
    position: string;
    dx: number;
    dy: number;
  }): Shape;

  abstract matchPoints(details: {
    point: [number, number];
    ribbon: ShapeSet;
    slice: Shape;
  }): ShapeSet["matchedPoints"];

  abstract matchPointsFromTemplate(details: {
    ribbon: ShapeSet;
    template: Template;
  }): ShapeSet["matchedPoints"];

  abstract findContainingSlice(details: {
    point: [number, number];
    sets: ShapeSet[];
  }): { set: ShapeSet; slice: Shape } | null;

  abstract isOutOfBounds(details: {
    shape: Shape;
    canvas: {
      width: number;
      height: number;
    };
  }): boolean;

  abstract drawShape(details: {
    shape: Shape;
    ctx: CanvasRenderingContext2D;
    color: string;
    thickness: number;
  }): void;

  abstract findNearestVertex(details: {
    point: [number, number];
    shapeSets: ShapeSet[];
  }): {
    distance: number;
    vertex: [number, number];
    vertexPosition: string;
    slice: Shape;
    ribbonId: ShapeSet["id"];
  };

  abstract addSlice(details: {
    top: boolean;
    shapes: Shape[];
    id: number;
  }): Shape[];

  abstract findCorners(details: {
    imageData: ImageData;
    imageContext: CanvasRenderingContext2D;
  }): {
    corners: [number, number][];
    imageData: ImageData;
  };

  abstract getValidSlices(points: Point[]): Line[][];

  abstract geneticAlgorithm(slices: Shape[], edgeData: ImageData): Shape[];

  abstract distanceSegmentToPoint(A: Vertex, B: Vertex, C: Vertex): number;
}
