export type LineSegment = {
  r: number;
  theta: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type Vertex = {
  x: number;
  y: number;
};

export type Status = "editing" | "matching" | "saved";

export type TrapezoidSet = {
  id: number;
  name: string;
  trapezoids: Trapezoid[];
  color: string;
  thickness: number;
  status: Status;
  matchedPoints: Vertex[];
};

export type Trapezoid = {
  top: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">;
  right: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">;
  left: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">;
  bottom: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">;
};

export type SliceConfiguration = {
  index: number;
  contrast?: number;
  brightness?: number;
  focus?: number;
};

export type ZoomState = {
  x: number;
  y: number;
  scale: number;
};
