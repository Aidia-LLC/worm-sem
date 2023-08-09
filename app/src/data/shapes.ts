type LineSegment = {
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

type Status = "editing" | "matching-all" | "matching-one" | "saved";

export type RibbonData = {
  id: number;
  name: string;
  slices: Slice[];
  color: string;
  thickness: number;
  status: Status;
  matchedPoints: Vertex[];
  clickedPoints: [number, number][];
  clickedPointIndex: number;
  slicesToConfigure: Slice["id"][];
  slicesToMove: Slice["id"][];
  configurations: SliceConfiguration[];
};

export type Slice = {
  id: number;
} & Trapezoid;

export type Trapezoid = {
  top: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">;
  right: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">;
  left: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">;
  bottom: Pick<LineSegment, "x1" | "x2" | "y1" | "y2">;
};

export type SliceConfiguration = {
  id: number;
  index: number;
  contrast?: number;
  brightness?: number;
  focus?: number;
  point: Vertex;
};

export type FinalSliceConfiguration = {
  label: string;
  contrast: number;
  brightness: number;
  magnification: number;
  focus: number;
  point: Vertex;
  ribbonId: number;
  ribbonName: string;
};
