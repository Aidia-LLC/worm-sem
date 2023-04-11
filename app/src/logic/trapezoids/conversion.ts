const WIDTH = 1024;
const HEIGHT = 768;

export const convertCoordinatesForSEM = (
  coordinates: { x: number; y: number },
  size: {
    width: number;
    height: number;
  }
) => {
  const xPercent = coordinates.x / size.width;
  const yPercent = coordinates.y / size.height;
  return {
    x: xPercent * WIDTH,
    y: yPercent * HEIGHT,
  };
};
