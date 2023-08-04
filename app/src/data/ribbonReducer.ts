import { RibbonData, Vertex } from "src/types/canvas";

type DraggingData = {
  ribbonId: RibbonData["id"] | null;
  sliceId: number;
  vertexIndex?: number;
  position: { x: number; y: number };
};

export const ribbonReducerInitialState = {
  ribbons: [] as RibbonData[],
  focusedRibbonId: null as RibbonData["id"] | null,
  draggingData: null as DraggingData | null,
  focusedSliceIndex: -1,
  grabbing: false,
  clickedPoints: [] as [number, number][],
  clickedPoint: null as Vertex | null,
  detection: true,
  detectionLoading: false,
  masks: [] as ImageData[],
};

export type RibbonDispatchPayload =
  | {
      action: "setRibbons";
      payload: RibbonData[];
    }
  | {
      action: "setFocusedRibbonId";
      payload: number | null;
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
    }
  | {
      action: "addRibbon";
      payload: RibbonData;
    }
  | {
      action: "setFocusedSliceIndex";
      payload: number;
    }
  | {
      action: "clearFocusedSlice";
    }
  | {
      action: "updateSliceConfiguration";
      payload: {
        brightness?: number;
        contrast?: number;
        focus?: number;
      };
    }
  | {
      action: "resetSliceConfigurations";
      payload: {
        brightness: number;
        contrast: number;
        focus: number;
      };
    }
  | {
      action: "updateRibbon";
      payload: Pick<RibbonData, "id"> & Partial<RibbonData>;
    }
  | {
      action: "deleteRibbon";
      payload: Pick<RibbonData, "id">;
    }
  | {
      action: "setDraggingData";
      payload: DraggingData | null;
    };

export type RibbonReducerState = typeof ribbonReducerInitialState;

export const ribbonDispatcher = (
  state: typeof ribbonReducerInitialState,
  event: RibbonDispatchPayload
): RibbonReducerState => {
  switch (event.action) {
    case "setDraggingData":
      return { ...state, draggingData: event.payload };
    case "setRibbons":
      return { ...state, ribbons: event.payload };
    case "addRibbon":
      return { ...state, ribbons: [...state.ribbons, event.payload] };
    case "updateRibbon":
      return {
        ...state,
        ribbons: state.ribbons.map((ribbon) => {
          if (ribbon.id !== event.payload.id) return ribbon;
          return {
            ...ribbon,
            ...event.payload,
          };
        }),
      };
    case "deleteRibbon":
      return {
        ...state,
        ribbons: state.ribbons.filter(
          (ribbon) => ribbon.id !== event.payload.id
        ),
      };
    case "setFocusedRibbonId":
      return { ...state, focusedRibbonId: event.payload };
    case "setGrabbing":
      return { ...state, grabbing: event.payload };
    case "setClickedPoints":
      console.log("setClickedPoints", event.payload);
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
      return {
        ...state,
        ribbons: [],
        masks: [],
        clickedPoints: [],
        focusedRibbonId: null,
        focusedSliceIndex: -1,
        draggingData: null,
      };
    case "setFocusedSliceIndex":
      return { ...state, focusedSliceIndex: event.payload };
    case "clearFocusedSlice":
      return { ...state, focusedSliceIndex: -1 };
    case "resetSliceConfigurations":
      return {
        ...state,
        ribbons: state.ribbons.map((ribbon) => {
          if (ribbon.id !== state.focusedRibbonId) return ribbon;
          return {
            ...ribbon,
            configurations: ribbon.slices.map((_, index) => ({
              index,
              brightness: event.payload.brightness,
              contrast: event.payload.contrast,
              focus: event.payload.focus,
            })),
          };
        }),
      };
    case "updateSliceConfiguration":
      const { brightness, contrast, focus } = event.payload;
      const { focusedRibbonId, focusedSliceIndex } = state;
      if (focusedRibbonId === null || focusedSliceIndex === -1) return state;
      return {
        ...state,
        ribbons: state.ribbons.map((ribbon) => {
          if (ribbon.id !== focusedRibbonId) return ribbon;
          return {
            ...ribbon,
            configurations: ribbon.configurations.map((config, idx) => {
              if (idx !== focusedSliceIndex) return config;
              return {
                ...config,
                brightness: brightness ?? config.brightness,
                contrast: contrast ?? config.contrast,
                focus: focus ?? config.focus,
              };
            }),
          };
        }),
      };
  }
};
