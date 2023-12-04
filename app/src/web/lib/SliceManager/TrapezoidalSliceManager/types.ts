import { Shape, ShapeSet } from "../types";

export type LineSegment = {
  r: number;
  theta: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type TrapezoidalSlice = Shape & {
  top: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">;
  right: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">;
  left: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">;
  bottom: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">;
};

export type TrapezoidalShapeSet = ShapeSet & {
  slices: TrapezoidalSlice[];
};

export type Vertex = {
  x: number;
  y: number;
};
