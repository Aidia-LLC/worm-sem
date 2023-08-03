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

type DispatchPayload =
  | {
      action: "setRibbons";
      payload: RibbonData[];
    }
  | {
      action: "setFocusedRibbon";
      payload: number;
    }
  | {
      action: "setGrabbing";
      payload: boolean;
    }
  | {
      action: "setClickedPoints";
      payload: [number, number][];
    }
  | {
      action: "setClickedPoint";
      payload: Vertex | null;
    }
  | {
      action: "setDetection";
      payload: boolean;
    }
  | {
      action: "setDetectionLoading";
      payload: boolean;
    }
  | {
      action: "setMasks";
      payload: ImageData[];
    }
  | {
      action: "resetImage";
    };

export type RibbonReducerState = typeof ribbonReducerInitialState;

export const ribbonDispatcher = (
  state: typeof ribbonReducerInitialState,
  event: DispatchPayload
) => {
  switch (event.action) {
    case "setRibbons":
      return { ...state, ribbons: event.payload };
    case "setFocusedRibbon":
      return { ...state, focusedRibbon: event.payload };
    case "setGrabbing":
      return { ...state, grabbing: event.payload };
    case "setClickedPoints":
      return { ...state, clickedPoints: event.payload };
    case "setClickedPoint":
      return { ...state, clickedPoint: event.payload };
    case "setDetection":
      return { ...state, detection: event.payload };
    case "setDetectionLoading":
      return { ...state, detectionLoading: event.payload };
    case "setMasks":
      return { ...state, masks: event.payload };
    case "resetImage":
      return { ...state, ribbons: [], masks: [], clickedPoints: [] };
    default:
      return state;
  }
};
