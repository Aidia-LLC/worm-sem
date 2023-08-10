import { TrapezoidalSlice } from "../types";

const MIN_ANGLE = 20;
const MAX_ANGLE = 160;

const getAngle = (line1: any, line2: any): number => {
  const m1 = (line1.y1 - line1.y2) / (line1.x1 - line1.x2);
  const m2 = (line2.y1 - line2.y2) / (line2.x1 - line2.x2);
  const tanTheta = Math.abs((m1 - m2) / (1 + m1 * m2));
  const angle = Math.atan(tanTheta) * (180 / Math.PI);
  return angle;
};

/// makes sure every angle is between a certain range
export const validateAngles = (trapezoid: TrapezoidalSlice): boolean => {
  const angle1 = getAngle(trapezoid.top, trapezoid.left);
  const angle2 = getAngle(trapezoid.right, trapezoid.top);
  const angle3 = getAngle(trapezoid.left, trapezoid.bottom);
  const angle4 = getAngle(trapezoid.bottom, trapezoid.right);
  return (
    angle1 < MAX_ANGLE &&
    angle2 < MAX_ANGLE &&
    angle3 < MAX_ANGLE &&
    angle4 < MAX_ANGLE &&
    angle1 > MIN_ANGLE &&
    angle2 > MIN_ANGLE &&
    angle3 > MIN_ANGLE &&
    angle4 > MIN_ANGLE
  );
};
