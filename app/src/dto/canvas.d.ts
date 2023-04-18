export type Trapezoid = {
  top: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">;
  right: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">;
  left: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">;
  bottom: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">;
};

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

export type Status = 'editing' | 'matching' | 'saved';

export type TrapezoidSet = {
  trapezoids: Trapezoid[];
  id: number;
  color: string;
  thickness: number;
  status: Status;
  matchedPoints: Vertex[];
};
