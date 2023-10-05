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

const micronsInMeter = 1_000_000;

const metersToMicrons = (meters: number) => Math.round(meters * micronsInMeter);
const micronsToMeters = (microns: number) => microns / micronsInMeter;

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
  const stageWidthInMicrons = metersToMicrons(stageConfiguration.width);
  const stageHeightInMicrons = metersToMicrons(stageConfiguration.height);

  const scaleX = canvasConfiguration.width / stageWidthInMicrons;
  const scaleY = canvasConfiguration.height / stageHeightInMicrons;

  const translatedX =
    canvasConfiguration.width / 2 -
    (metersToMicrons(point[0]) - metersToMicrons(stageConfiguration.x)) *
      scaleX;

  const translatedY =
    (metersToMicrons(point[1]) - metersToMicrons(stageConfiguration.y)) *
      scaleY +
    canvasConfiguration.height / 2;

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
  const stageWidthInMicrons = metersToMicrons(stageConfiguration.width);
  const stageHeightInMicrons = metersToMicrons(stageConfiguration.height);

  const scaleX = stageWidthInMicrons / canvasConfiguration.width;
  const scaleY = stageHeightInMicrons / canvasConfiguration.height;

  const translatedX = micronsToMeters(
    (canvasConfiguration.width / 2 - point[0]) * scaleX +
      metersToMicrons(stageConfiguration.x)
  );
  const translatedY = micronsToMeters(
    (point[1] - canvasConfiguration.height / 2) * scaleY +
      metersToMicrons(stageConfiguration.y)
  );

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
