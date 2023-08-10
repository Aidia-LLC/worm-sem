import { Shape, ShapeSet } from "src/lib/SliceManager/types";
import { TrapezoidalShapeSet } from "../types";

export const findNearestVertex = ({
  point,
  shapeSets,
}: {
  point: [number, number];
  shapeSets: TrapezoidalShapeSet[];
}) => {
  const [x, y] = point;

  let nearestVertex: [number, number] | undefined;
  let nearestDistance = Infinity;
  let nearestSlice: Shape | undefined;
  let nearestRibbonId: ShapeSet["id"] | undefined;
  let position: "top1" | "top2" | "bottom1" | "bottom2" | undefined;

  for (const ribbon of shapeSets) {
    for (const slice of ribbon.slices) {
      const vertices = [
        { x: slice.top.x1, y: slice.top.y1, position: "top1" as const },
        { x: slice.top.x2, y: slice.top.y2, position: "top2" as const },
        {
          x: slice.bottom.x1,
          y: slice.bottom.y1,
          position: "bottom1" as const,
        },
        {
          x: slice.bottom.x2,
          y: slice.bottom.y2,
          position: "bottom2" as const,
        },
      ];
      for (const vertex of vertices) {
        const distance = Math.sqrt(
          Math.pow(vertex.x - x, 2) + Math.pow(vertex.y - y, 2)
        );
        if (distance < nearestDistance) {
          nearestVertex = [vertex.x, vertex.y];
          nearestDistance = distance;
          nearestSlice = slice;
          nearestRibbonId = ribbon.id;
          position = vertex.position;
        }
      }
    }
  }
  return {
    distance: nearestDistance,
    vertex: nearestVertex!,
    vertexPosition: position!,
    slice: nearestSlice!,
    ribbonId: nearestRibbonId!,
  };
};
