import { ProcessingOptions } from "src/lib/data/ProcessingOptions";
import { Shape, ShapeSet } from "./types";

export abstract class SliceManager {
  abstract detectRibbon(details: {
    referencePoint: [number, number];
    options: ProcessingOptions;
    edgeDataCanvas: HTMLCanvasElement;
    debugCanvas?: HTMLCanvasElement;
  }): Promise<Shape[]>;

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
}
