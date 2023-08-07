import { RibbonData, Slice } from "@data/shapes";

type DraggingData = {
  ribbonId: RibbonData["id"] | null;
  sliceId?: number;
  vertexPosition?: "top1" | "top2" | "bottom1" | "bottom2";
  position: { x: number; y: number };
};

export const ribbonReducerInitialState = {
  ribbons: [] as RibbonData[],
  focusedRibbonId: null as RibbonData["id"] | null,
  draggingData: null as DraggingData | null,
  focusedSliceIndex: -1,
  grabbing: false,
  clickedPoints: [] as [number, number][],
  detection: true,
  detectionLoading: false,
  masks: [] as ImageData[],
  currentMaskIndex: -1,
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
      action: "focusNextSlice";
    }
  | {
      action: "focusPreviousSlice";
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
    }
  | {
      action: "changeMask";
      payload: "next" | "previous";
    }
  | {
      action: "setSlicesToConfigure";
      payload: Slice["id"][];
    };

export type RibbonReducerState = typeof ribbonReducerInitialState;

export const ribbonDispatcher = (
  state: typeof ribbonReducerInitialState,
  ...events: RibbonDispatchPayload[]
): RibbonReducerState => {
  let newState = state;
  for (const event of events) newState = ribbonUpdater(newState, event);
  return newState;
};

const ribbonUpdater = (
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
    case "setDetection":
      return { ...state, detection: event.payload };
    case "setDetectionLoading":
      return { ...state, detectionLoading: event.payload };
    case "setMasks":
      return {
        ...state,
        masks: event.payload,
        currentMaskIndex: event.payload.length > 0 ? 0 : -1,
      };
    case "changeMask":
      let nextIndex =
        state.currentMaskIndex + (event.payload === "next" ? 1 : -1);
      if (nextIndex < 0) nextIndex = state.masks.length - 1;
      if (nextIndex >= state.masks.length) nextIndex = 0;
      return {
        ...state,
        currentMaskIndex: nextIndex,
      };
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
    case "focusNextSlice": {
      const { focusedRibbonId, focusedSliceIndex } = state;
      if (focusedRibbonId === null) return state;
      const ribbon = state.ribbons.find(
        (ribbon) => ribbon.id === focusedRibbonId
      );
      if (!ribbon) return state;
      for (let i = focusedSliceIndex + 1; i < ribbon.slices.length; i++) {
        if (ribbon.slicesToConfigure.includes(ribbon.slices[i].id))
          return { ...state, focusedSliceIndex: i };
      }
      return state;
    }
    case "focusPreviousSlice": {
      const { focusedRibbonId, focusedSliceIndex } = state;
      if (focusedRibbonId === null) return state;
      const ribbon = state.ribbons.find(
        (ribbon) => ribbon.id === focusedRibbonId
      );
      if (!ribbon) return state;
      for (let i = focusedSliceIndex - 1; i >= 0; i--) {
        if (ribbon.slicesToConfigure.includes(ribbon.slices[i].id))
          return { ...state, focusedSliceIndex: i };
      }
      return state;
    }
    case "clearFocusedSlice":
      return { ...state, focusedSliceIndex: -1 };
    case "setSlicesToConfigure": {
      const { focusedRibbonId } = state;
      if (focusedRibbonId === null) return state;
      return {
        ...state,
        ribbons: state.ribbons.map((ribbon) => {
          if (ribbon.id !== focusedRibbonId) return ribbon;
          return {
            ...ribbon,
            slicesToConfigure: event.payload,
          };
        }),
      };
    }
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
    case "updateSliceConfiguration": {
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
  }
};
