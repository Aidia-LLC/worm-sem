import { Trapezoid } from "@components/Canvas";

export enum Status {
  Editing,
  Matching,
  Saved,
}
export type TrapezoidSet = {
  trapezoids: Trapezoid[];
  id: number;
  color: string;
  thickness: number;
  status: Status;
  matchedPoints: Vertex[];
};
