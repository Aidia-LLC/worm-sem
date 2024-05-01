import { StageConfiguration } from "@utils/computeStageCoordinates";

export type Shape = {
  id: number;
} & Record<string, any>;

export type ShapeSetStatus =
  | "editing"
  | "matching-all"
  | "matching-one"
  | "saved";

export type ShapeSet = {
  id: number;
  name: string;
  color: string;
  thickness: number;
  status: ShapeSetStatus;
  slices: Shape[];
  referencePoints: [number, number][];
  referencePointIndex: number;
  slicesToConfigure: Shape["id"][];
  slicesToMove: Shape["id"][];
  matchedPoints: [number, number][];
  configurations: ShapeConfiguration[];
  allowDetectAgain: boolean;
};

export type ShapeConfiguration = {
  id: number;
  index: number;
  contrast?: number;
  brightness?: number;
  focus?: number;
  point: [number, number];
  paramsTouched: boolean;
};

export type FinalShapeConfiguration = {
  label: string;
  contrast: number;
  brightness: number;
  magnification: number;
  focus: number;
  point: [number, number];
  ribbonId: number;
  ribbonName: string;
};

export type FinalRibbonConfiguration = {
  ribbon: Pick<ShapeSet, "id" | "name">;
  stage: StageConfiguration;
  slices: FinalShapeConfiguration[];
};
