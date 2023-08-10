import { Shape, ShapeSet } from "src/lib/SliceManager/types";

export const matchPoints = ({
  point,
  ribbon,
  slice,
}: {
  point: [number, number];
  ribbon: ShapeSet;
  slice: Shape;
}): ShapeSet["matchedPoints"] => {
  if (ribbon.matchedPoints.length > 0 && ribbon.status === "matching-one")
    return ribbon.slices.map((s, i) => {
      if (s.id !== slice.id) return ribbon.matchedPoints[i];
      return point;
    });

  const center = {
    x: (slice.top.x1 + slice.top.x2 + slice.bottom.x1 + slice.bottom.x2) / 4,
    y: (slice.top.y1 + slice.top.y2 + slice.bottom.y1 + slice.bottom.y2) / 4,
  };
  let angle1 = 0;
  // angle1 of the top line
  if (slice.top.x1 === slice.top.x2) {
    angle1 = Math.PI / 2;
  } else {
    angle1 = Math.atan(
      (slice.top.y2 - slice.top.y1) / (slice.top.x2 - slice.top.x1)
    );
  }

  const dx = point[0] - center.x;
  const dy = point[1] - center.y;

  const points: [number, number][] = [];
  for (const otherSlice of ribbon.slices) {
    let angle2 = 0;
    // angle2 of the top line
    if (otherSlice.top.x1 === otherSlice.top.x2) {
      angle2 = Math.PI / 2;
    } else {
      angle2 = Math.atan(
        (otherSlice.top.y2 - otherSlice.top.y1) /
          (otherSlice.top.x2 - otherSlice.top.x1)
      );
    }
    const angle = angle2 - angle1;

    const otherCenter = {
      x:
        (otherSlice.top.x1 +
          otherSlice.top.x2 +
          otherSlice.bottom.x1 +
          otherSlice.bottom.x2) /
        4,
      y:
        (otherSlice.top.y1 +
          otherSlice.top.y2 +
          otherSlice.bottom.y1 +
          otherSlice.bottom.y2) /
        4,
    };
    const otherDx = dx * Math.cos(angle) - dy * Math.sin(angle);
    const otherDy = dx * Math.sin(angle) + dy * Math.cos(angle);
    const otherX = otherCenter.x + otherDx;
    const otherY = otherCenter.y + otherDy;
    if (slice.id === otherSlice.id) points.push(point);
    else points.push([otherX, otherY]);
  }
  return points;
};
