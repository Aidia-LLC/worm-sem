import { RibbonData, Vertex } from "src/types/canvas";

export const ribbonReducerInitialState = {
  ribbons: [] as RibbonData[],
  focusedRibbon: null as RibbonData["id"] | null,
  grabbing: false,
  clickedPoints: [] as [number, number][],
  clickedPoint: null as Vertex | null,
  detection: true,
  detectionLoading: false,
  masks: [] as ImageData[],
};

export const actions = {
  setRibbons: "setRibbons",
  setFocusedRibbon: "setFocusedRibbon",
  setGrabbing: "setGrabbing",
  setClickedPoints: "setClickedPoints",
  setClickedPoint: "setClickedPoint",
  setDetection: "setDetection",
  setDetectionLoading: "setDetectionLoading",
  setMasks: "setMasks",
  resetImage: "resetImage",
};

export type RibbonReducerState = typeof ribbonReducerInitialState;

export const ribbonDispatcher = (
  state: typeof ribbonReducerInitialState,
  action: keyof typeof actions,
  payload: any
) => {
  switch (action) {
    case actions.setRibbons:
      return { ...state, ribbons: payload };
    case actions.setFocusedRibbon:
      return { ...state, focusedRibbon: payload };
    case actions.setGrabbing:
      return { ...state, grabbing: payload };
    case actions.setClickedPoints:
      return { ...state, clickedPoints: payload };
    case actions.setClickedPoint:
      return { ...state, clickedPoint: payload };
    case actions.setDetection:
      return { ...state, detection: payload };
    case actions.setDetectionLoading:
      return { ...state, detectionLoading: payload };
    case actions.setMasks:
      return { ...state, masks: payload };
    case actions.resetImage:
      return { ...state, ribbons: [], masks: [], clickedPoints: [] };
    default:
      return state;
  }
};
