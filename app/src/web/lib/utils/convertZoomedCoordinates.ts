import type { ZoomState } from "@components/RibbonDetector/ZoomController";
import { lerp } from "./interpolation";

export const convertZoomedCoordinates = (
  x: number,
  y: number,
  zoom: ZoomState,
  width: number,
  height: number
) => {
  if (zoom.status !== "zoomed-in") return { x, y };

  const viewportWidth = width / zoom.scale;
  const viewportHeight = height / zoom.scale;

  const percentX = x / width;
  const percentY = y / height;

  const clickedX = lerp(
    zoom.x - viewportWidth / 2,
    zoom.x + viewportWidth / 2,
    percentX
  );
  const clickedY = lerp(
    zoom.y - viewportHeight / 2,
    zoom.y + viewportHeight / 2,
    percentY
  );

  return { x: clickedX, y: clickedY };
};
