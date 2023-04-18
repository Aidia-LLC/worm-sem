import { Trapezoid, Vertex } from "@components/Canvas";
import { Status } from "./canvas";

export type TrapezoidSet = {
  trapezoids: Trapezoid[];
  id: number;
  color: string;
  thickness: number;
  status: Status;
  matchedPoints: Vertex[];
};
