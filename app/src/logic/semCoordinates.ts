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
  const percentX = point.x / canvasConfiguration.width;
  const percentY = point.y / canvasConfiguration.height;
  const newX =
    stageConfiguration.x +
    percentX * stageConfiguration.width -
    stageConfiguration.width / 2;
  const newY =
    stageConfiguration.y +
    percentY * stageConfiguration.height -
    stageConfiguration.height / 2;
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
