import {
  RibbonDispatchPayload,
  RibbonReducerState,
} from "src/data/ribbonReducer";
import { RibbonData, Vertex } from "src/types/canvas";
import { findNearestPoint, isPointInTrapezoid } from "./trapezoids/points";

export default function pointMatching(
  x: number,
  y: number,
  trapezoidSet: RibbonData,
  ribbonDispatch: (x: RibbonDispatchPayload) => void,
  ribbonReducer: RibbonReducerState,
  overlayCanvasRef: any,
  handleMouseMove: any,
  handleMouseUp: any
) {
  const { slices: trapezoids } = trapezoidSet;
  if (trapezoidSet.matchedPoints.length !== 0) {
    // find closest matched point
    const { nearestDistance, nearestPoint } = findNearestPoint(
      x,
      y,
      trapezoidSet.matchedPoints
    );
    if (nearestDistance < 10) {
      // click and drag
      overlayCanvasRef.addEventListener("mousemove", handleMouseMove);
      overlayCanvasRef.addEventListener("mouseup", handleMouseUp);
      if (nearestPoint)
        ribbonDispatch({
          action: "setDraggingData",
          payload: {
            position: nearestPoint,
            ribbonId: trapezoidSet.id,
          },
        });
      return;
    } else {
      ribbonDispatch({
        action: "setRibbons",
        payload: ribbonReducer.ribbons.map((t) => {
          if (t.slices === trapezoids) {
            return {
              ...t,
              matchedPoints: [],
            };
          }
          return t;
        }),
      });
    }
  }
  const { slice, inTrapezoid } = isPointInTrapezoid(x, y, ribbonReducer.ribbons);
  if (!inTrapezoid || !slice) return;
  const center = {
    x:
      (slice.top.x1 +
        slice.top.x2 +
        slice.bottom.x1 +
        slice.bottom.x2) /
      4,
    y:
      (slice.top.y1 +
        slice.top.y2 +
        slice.bottom.y1 +
        slice.bottom.y2) /
      4,
  };
  let angle1 = 0;
  // angle1 of the top line
  if (slice.top.x1 === slice.top.x2) {
    angle1 = Math.PI / 2;
  } else {
    angle1 = Math.atan(
      (slice.top.y2 - slice.top.y1) /
        (slice.top.x2 - slice.top.x1)
    );
  }

  const dx = x - center.x;
  const dy = y - center.y;

  const points: Vertex[] = [];
  points.push({
    x,
    y,
  });
  for (const otherTrapezoid of trapezoids) {
    if (otherTrapezoid === slice) continue;
    let angle2 = 0;
    // angle2 of the top line
    if (otherTrapezoid.top.x1 === otherTrapezoid.top.x2) {
      angle2 = Math.PI / 2;
    } else {
      angle2 = Math.atan(
        (otherTrapezoid.top.y2 - otherTrapezoid.top.y1) /
          (otherTrapezoid.top.x2 - otherTrapezoid.top.x1)
      );
    }
    const angle = angle2 - angle1;

    const otherCenter = {
      x:
        (otherTrapezoid.top.x1 +
          otherTrapezoid.top.x2 +
          otherTrapezoid.bottom.x1 +
          otherTrapezoid.bottom.x2) /
        4,
      y:
        (otherTrapezoid.top.y1 +
          otherTrapezoid.top.y2 +
          otherTrapezoid.bottom.y1 +
          otherTrapezoid.bottom.y2) /
        4,
    };
    const otherDx = dx * Math.cos(angle) - dy * Math.sin(angle);
    const otherDy = dx * Math.sin(angle) + dy * Math.cos(angle);
    const otherX = otherCenter.x + otherDx;
    const otherY = otherCenter.y + otherDy;
    points.push({
      x: otherX,
      y: otherY,
    });
  }
  ribbonDispatch({
    action: "setRibbons",
    payload: ribbonReducer.ribbons.map((t) => {
      if (t.slices === trapezoids) {
        return {
          ...t,
          matchedPoints: points,
        };
      }
      return t;
    }),
  });
}
