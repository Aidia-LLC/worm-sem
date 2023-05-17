export type StageConfiguration = {
  x: number;
  y: number;
  width: number;
  height: number;
  limits: {
    x: [number, number];
    y: [number, number];
  };
};

/// Convert device coordinates to SEM coordinates
export const computeStageCoordinates = ({
  point,
  canvasConfiguration,
  stageConfiguration,
}: {
  point: { x: number; y: number };
  canvasConfiguration: {
    width: number;
    height: number;
  };
  stageConfiguration: StageConfiguration;
}) => {
  const scaleX = stageConfiguration.width / canvasConfiguration.width;
  const scaleY = stageConfiguration.height / canvasConfiguration.height;

  const translatedX = (point.x - canvasConfiguration.width / 2) * scaleX;
  const translatedY = (point.y - canvasConfiguration.height / 2) * scaleY;

  const angle = -Math.PI / 4; // may end up being pi/6 or some other variable value
  const zx = Math.cos(angle) * translatedX;
  const zy = Math.sin(angle) * translatedY;

  const newX = zx - zy + stageConfiguration.x;
  const newY = zx + zy + stageConfiguration.y;

  const limitedX = Math.max(
    stageConfiguration.limits.x[0],
    Math.min(stageConfiguration.limits.x[1], newX)
  );
  const limitedY = Math.max(
    stageConfiguration.limits.y[0],
    Math.min(stageConfiguration.limits.y[1], newY)
  );
  return { x: limitedX, y: limitedY };
};
