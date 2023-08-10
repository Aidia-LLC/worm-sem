import { TrapezoidalSlice } from "../types";

function getAngle(line1: any, line2: any): number {
  const m1 = (line1.y1 - line1.y2) / (line1.x1 - line1.x2);
  const m2 = (line2.y1 - line2.y2) / (line2.x1 - line2.x2);
  const tanTheta = Math.abs((m1 - m2) / (1 + m1 * m2));
  const angle = Math.atan(tanTheta) * (180 / Math.PI);
  return angle;
}

export function calculateAngles(trapezoid: TrapezoidalSlice): boolean {
  //makes sure every angle is under 180 degrees and over 20 degrees
  const angle1 = getAngle(trapezoid.top, trapezoid.left);
  const angle2 = getAngle(trapezoid.right, trapezoid.top);
  const angle3 = getAngle(trapezoid.left, trapezoid.bottom);
  const angle4 = getAngle(trapezoid.bottom, trapezoid.right);
  return (
    angle1 < 160 &&
    angle2 < 160 &&
    angle3 < 160 &&
    angle4 < 160 &&
    angle1 > 20 &&
    angle2 > 20 &&
    angle3 > 20 &&
    angle4 > 20
  );
}
