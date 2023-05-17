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

  const translatedX =
    (point.x - canvasConfiguration.width / 2) * scaleX + stageConfiguration.x;
  const translatedY =
    (point.y - canvasConfiguration.height / 2) * scaleY + stageConfiguration.y;

  const limitedX = Math.max(
    stageConfiguration.limits.x[0],
    Math.min(stageConfiguration.limits.x[1], translatedX)
  );
  const limitedY = Math.max(
    stageConfiguration.limits.y[0],
    Math.min(stageConfiguration.limits.y[1], translatedY)
  );

  console.log({
    point,
    canvasConfiguration,
    stageConfiguration,
    scaleX,
    scaleY,
    translatedX,
    translatedY,
    limitedX,
    limitedY,
  })
  return { x: limitedX, y: limitedY };
};
