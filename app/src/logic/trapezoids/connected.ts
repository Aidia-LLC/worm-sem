import { RibbonData, Trapezoid, Vertex } from "@dto/canvas";
import { calculateArea, translateTrapezoid } from "@logic/canvas";

export const getConnectedSlices = (
  id: number,
  options: any,
  searchData: any,
  setRibbons: any,
  setSearchData: any,
  setShowOriginalImage: any,
  ribbons: any,
  setNextId: any,
  trapezoid: Trapezoid
) => {
  let { imgX, imgY, ctx, imageData, toggleOriginalImage } = searchData();
  console.log("inside");
  trapezoid = computeTrapezoid([
    { x: trapezoid.top.x1, y: trapezoid.top.y1 },
    { x: trapezoid.top.x2, y: trapezoid.top.y2 },
    { x: trapezoid.bottom.x2, y: trapezoid.bottom.y2 },
    { x: trapezoid.bottom.x1, y: trapezoid.bottom.y1 },
  ])!;
  // const square = getSquare(imageData, imgX, imgY, options.options.squareSize);
  // let fit = getPointsOnTrapezoid(
  //   square,
  //   trapezoid,
  //   options.options,
  //   imgX - options.options.squareSize / 2,
  //   imgY - options.options.squareSize / 2
  // );
  // const connectedTrapezoids = findConnectedTrapezoids(
  //   trapezoid,
  //   ctx,
  //   imgX,
  //   imgY,
  //   options.options,
  //   fit
  // );
  // const filteredTrapezoids = filterTrapezoids(connectedTrapezoids, ribbons());
  // const orderedTrapezoids = orderTrapezoids([...filteredTrapezoids, trapezoid]);
  // console.log('found', orderedTrapezoids.length)
  // Copy a new trapezoid on top of the old one
  const yShift =
    Math.round(
      (trapezoid.top.y1 + trapezoid.top.y2) / 2 -
        (trapezoid.bottom.y1 + trapezoid.bottom.y2) / 2
    ) - 5;
  const length = Math.round(
    Math.sqrt(
      (trapezoid.top.x1 - trapezoid.top.x2) ** 2 +
        (trapezoid.top.y1 - trapezoid.top.y2) ** 2
    )
  );
  const bottomLength = Math.round(
    Math.sqrt(
      (trapezoid.bottom.x1 - trapezoid.bottom.x2) ** 2 +
        (trapezoid.bottom.y1 - trapezoid.bottom.y2) ** 2
    )
  );
  const area = calculateArea(trapezoid);
  const height = Math.round((2 * area) / (length + bottomLength));
  const xShift = Math.round(
    ((trapezoid.top.y1 - trapezoid.top.y2) / length) * height
  );

  const topTrapezoid = translateTrapezoid(trapezoid, yShift, xShift);
  const bottomTrapezoid = translateTrapezoid(trapezoid, -yShift, -xShift);
  const ribbon = ribbons().find((ribbon: any) => ribbon.id === id);
  setRibbons((prev: any) => prev.filter((ribbon: any) => ribbon.id !== id));
  setRibbons((prev: RibbonData[]) => {
    return [
      ...prev,
      {
        trapezoids: [topTrapezoid, trapezoid, bottomTrapezoid],
        phase: 2,
        status: "editing",
        id: id + 1,
        name: `Ribbon ${Math.ceil(id / 2)}`,
        color: ribbon.color,
        matchedPoints: [],
        reversed: false,
        thickness: 5,
      },
    ];
  });
  setNextId((nid: number) => nid + 1);
  if (toggleOriginalImage) {
    setShowOriginalImage(true);
  }
  setSearchData({ pause: false, id: null });
};

const orderTrapezoids = (trapezoids: Trapezoid[]) => {
  // order with the top trapezoid being 1
  return trapezoids.sort((a, b) => {
    const aTop = Math.min(a.top.y1, a.top.y2);
    const bTop = Math.min(b.top.y1, b.top.y2);
    return aTop - bTop;
  });
};

function computeTrapezoid(
  vertices: Vertex[]
  // ctx?: CanvasRenderingContext2D
): Trapezoid | null {
  if (vertices.length !== 4) return null;
  //  the shortest edge is the bottom edge
  const pairs = [
    [vertices[0], vertices[1]],
    [vertices[1], vertices[3]],
    [vertices[3], vertices[2]],
    [vertices[2], vertices[0]],
    [vertices[3], vertices[0]],
    [vertices[2], vertices[1]],
  ];
  let shortestEdge: any | undefined;
  let shortestEdgeLength: number | undefined;
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    const dx = pair[1].x - pair[0].x;
    const dy = pair[1].y - pair[0].y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (shortestEdgeLength === undefined || length < shortestEdgeLength) {
      shortestEdgeLength = length;
      shortestEdge = pair;
    }
  }
  let bottomLeft = shortestEdge[0];
  let bottomRight = shortestEdge[1];
  if (bottomLeft.x > bottomRight.x) {
    const temp = bottomLeft;
    bottomLeft = bottomRight;
    bottomRight = temp;
  }
  let topRight = vertices.find(
    (v) => v !== bottomLeft && v !== bottomRight
  ) as Vertex;
  let topLeft = vertices.find(
    (v) => v !== bottomLeft && v !== bottomRight && v !== topRight
  ) as Vertex;
  if (topRight.x < topLeft.x) {
    const temp = topRight;
    topRight = topLeft;
    topLeft = temp;
  }
  if (topLeft.y > bottomLeft.y) {
    let temp = topLeft;
    topLeft = bottomLeft;
    bottomLeft = temp;
    temp = topRight;
    topRight = bottomRight;
    bottomRight = temp;
  }
  return {
    top: { x1: topLeft.x, y1: topLeft.y, x2: topRight.x, y2: topRight.y },
    bottom: {
      x1: bottomLeft.x,
      y1: bottomLeft.y,
      x2: bottomRight.x,
      y2: bottomRight.y,
    },
    left: { x1: topLeft.x, y1: topLeft.y, x2: bottomLeft.x, y2: bottomLeft.y },
    right: {
      x1: topRight.x,
      y1: topRight.y,
      x2: bottomRight.x,
      y2: bottomRight.y,
    },
  };
}
