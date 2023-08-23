export type StageConfiguration = {
  x: number;
  y: number;
  r: number;
  width: number;
  height: number;
  limits: {
    x: [number, number];
    y: [number, number];
  };
};

export const computeCanvasCoordinates = ({
  point,
  canvasConfiguration,
  stageConfiguration,
}: {
  point: [number, number];
  canvasConfiguration: {
    width: number;
    height: number;
  };
  stageConfiguration: StageConfiguration;
}) => {
  const scaleX = canvasConfiguration.width / stageConfiguration.width;
  const scaleY = canvasConfiguration.height / stageConfiguration.height;

  const translatedX =
    canvasConfiguration.width / 2 - (point[0] - stageConfiguration.x) * scaleX;

  const translatedY =
    (point[1] - stageConfiguration.y) * scaleY + canvasConfiguration.height / 2;

  return [translatedX, translatedY] as [number, number];
};

/// Convert device coordinates to SEM coordinates
export const computeStageCoordinates = ({
  point,
  canvasConfiguration,
  stageConfiguration,
}: {
  point: [number, number];
  canvasConfiguration: {
    width: number;
    height: number;
  };
  stageConfiguration: StageConfiguration;
}) => {
  const scaleX = stageConfiguration.width / canvasConfiguration.width;
  const scaleY = stageConfiguration.height / canvasConfiguration.height;

  const translatedX =
    (canvasConfiguration.width / 2 - point[0]) * scaleX + stageConfiguration.x;
  const translatedY =
    (point[1] - canvasConfiguration.height / 2) * scaleY + stageConfiguration.y;

  const limitedX = Math.max(
    stageConfiguration.limits.x[0],
    Math.min(stageConfiguration.limits.x[1], translatedX)
  );
  const limitedY = Math.max(
    stageConfiguration.limits.y[0],
    Math.min(stageConfiguration.limits.y[1], translatedY)
  );

  return [limitedX, limitedY] as [number, number];
};
