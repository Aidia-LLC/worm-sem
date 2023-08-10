import { TrapezoidalSlice } from "../types";
import { calculateArea } from "./calculateArea";
import { linesIntersect } from "./linesIntersect";

export const permuteTrapezoid = (trapezoid: TrapezoidalSlice) => {
  const points: [number, number][] = [
    [trapezoid.top.x1, trapezoid.top.y1],
    [trapezoid.top.x2, trapezoid.top.y2],
    [trapezoid.bottom.x1, trapezoid.bottom.y1],
    [trapezoid.bottom.x2, trapezoid.bottom.y2],
  ];
  const permutations = permutator(points);
  const trapezoids: TrapezoidalSlice[] = permutations.map((permutation) => {
    return {
      id: trapezoid.id,
      top: {
        x1: permutation[0][0],
        y1: permutation[0][1],
        x2: permutation[1][0],
        y2: permutation[1][1],
      },
      bottom: {
        x1: permutation[2][0],
        y1: permutation[2][1],
        x2: permutation[3][0],
        y2: permutation[3][1],
      },
      left: {
        x1: permutation[0][0],
        y1: permutation[0][1],
        x2: permutation[2][0],
        y2: permutation[2][1],
      },
      right: {
        x1: permutation[1][0],
        y1: permutation[1][1],
        x2: permutation[3][0],
        y2: permutation[3][1],
      },
    } as TrapezoidalSlice;
  });
  const data = trapezoids
    .filter((t) => t.top.x1 < t.top.x2 && t.bottom.x1 < t.bottom.x2)
    .filter(
      (t) =>
        !linesIntersect(
          [
            [t.top.x1, t.top.y1],
            [t.top.x2, t.top.y2],
          ],
          [
            [t.bottom.x1, t.bottom.y1],
            [t.bottom.x2, t.bottom.y2],
          ]
        ) &&
        !linesIntersect(
          [
            [t.left.x1, t.left.y1],
            [t.left.x2, t.left.y2],
          ],
          [
            [t.right.x1, t.right.y1],
            [t.right.x2, t.right.y2],
          ]
        )
    )
    .filter((t) => {
      const top = Math.sqrt(
        (t.top.x1 - t.top.x2) ** 2 + (t.top.y1 - t.top.y2) ** 2
      );
      const bottom = Math.sqrt(
        (t.bottom.x1 - t.bottom.x2) ** 2 + (t.bottom.y1 - t.bottom.y2) ** 2
      );
      const left = Math.sqrt(
        (t.left.x1 - t.left.x2) ** 2 + (t.left.y1 - t.left.y2) ** 2
      );
      const right = Math.sqrt(
        (t.right.x1 - t.right.x2) ** 2 + (t.right.y1 - t.right.y2) ** 2
      );
      const max = Math.max(top, bottom, left, right);
      return bottom === max;
    })
    .map((t) => ({
      trapezoid: t,
      area: calculateArea(t),
      semiPerimeter: calculateSemiPerimeter(t),
    }));
  const maxArea = Math.max(...data.map((d) => d.area));
  const d = data.find((d) => d.area === maxArea);
  if (!d) return trapezoid;
  return d.trapezoid;
};

const calculateSemiPerimeter = (trapezoid: TrapezoidalSlice): number => {
  const a = Math.sqrt(
    (trapezoid.top.x1 - trapezoid.top.x2) ** 2 +
      (trapezoid.top.y1 - trapezoid.top.y2) ** 2
  );
  const b = Math.sqrt(
    (trapezoid.bottom.x1 - trapezoid.bottom.x2) ** 2 +
      (trapezoid.bottom.y1 - trapezoid.bottom.y2) ** 2
  );
  const c = Math.sqrt(
    (trapezoid.left.x1 - trapezoid.left.x2) ** 2 +
      (trapezoid.left.y1 - trapezoid.left.y2) ** 2
  );
  const d = Math.sqrt(
    (trapezoid.right.x1 - trapezoid.right.x2) ** 2 +
      (trapezoid.right.y1 - trapezoid.right.y2) ** 2
  );
  // Calculate the semiperimeter of the quadrilateral
  const s = (a + b + c + d) / 2;
  return s;
};

const permutator = <T>(input: T[]) => {
  let permArr: T[][] = [],
    usedChars: T[] = [];
  return (function main() {
    for (let i = 0; i < input.length; i++) {
      let ch = input.splice(i, 1)[0];
      usedChars.push(ch);
      if (input.length == 0) {
        permArr.push(usedChars.slice());
      }
      main();
      input.splice(i, 0, ch);
      usedChars.pop();
    }
    return permArr;
  })();
};
