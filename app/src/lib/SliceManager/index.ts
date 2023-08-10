import { SliceManager } from "./SliceManager";
import { TrapezoidalSliceManager } from "./TrapezoidalSliceManager";

let sliceDetector: SliceManager | null = null;

export const getSliceManager = (): SliceManager => {
  if (!sliceDetector) sliceDetector = new TrapezoidalSliceManager();
  return sliceDetector;
};
