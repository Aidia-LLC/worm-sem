import { FinalRibbonConfiguration, Shape, ShapeSet } from "@SliceManager/types";
import {
  computeStageCoordinates,
  StageConfiguration,
} from "@utils/computeStageCoordinates";

type DraggingData = {
  ribbonId: ShapeSet["id"] | null;
  sliceId?: number;
  vertexPosition?: string;
  position: [number, number];
};

type AppPhase = "ribbon-detection" | "imaging";

export const ribbonReducerInitialState = {
  ribbons: [] as ShapeSet[],
  focusedRibbonId: null as ShapeSet["id"] | null,
  draggingData: null as DraggingData | null,
  focusedSliceIndex: -1,
  referencePoints: [] as [number, number][],
  detection: true,
  detectionLoading: false,
  cornerValidation: false,
  cornerPhase: "delete" as "delete" | "add" | "adjust",
  contours: [] as any,
  corners: [] as [number, number][],
  masks: [] as ImageData[],
  currentMaskIndex: -1,
  enqueuedRibbons: [] as FinalRibbonConfiguration[],
  phase: "ribbon-detection" as AppPhase,
};

export type RibbonDispatchPayload =
  | {
      action: "enqueueRibbon";
      payload: FinalRibbonConfiguration;
    }
  | {
      action: "setRibbons";
      payload: ShapeSet[];
    }
  | {
      action: "setFocusedRibbonId";
      payload: number | null;
    }
  | {
      action: "setPhase";
      payload: AppPhase;
    }
  | {
      action: "setReferencePoints";
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
      action: "setCornerValidation";
      payload: boolean;
    }
  | {
      action: "setCorners";
      payload: [number, number][];
    }
  | {
      action: "setCornerPhase";
      payload: "delete" | "add" | "adjust";
    }
  | {
      action: "setContours";
      payload: any;
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
      payload: ShapeSet;
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
        point?: {
          x?: number;
          y?: number;
        };
      };
    }
  | {
      action: "resetSliceConfigurations";
      payload: {
        brightness: number;
        contrast: number;
        focus: number;
        canvas: { width: number; height: number };
        stage: StageConfiguration;
      };
    }
  | {
      action: "updateRibbon";
      payload: Pick<ShapeSet, "id"> & Partial<ShapeSet>;
    }
  | {
      action: "deleteRibbon";
      payload: Pick<ShapeSet, "id">;
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
      payload: Shape["id"][];
    }
  | {
      action: "setSlicesToMove";
      payload: Shape["id"][];
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
    case "enqueueRibbon":
      return {
        ...state,
        enqueuedRibbons: [...state.enqueuedRibbons, event.payload],
        focusedRibbonId: null,
        ribbons: state.ribbons.map((ribbon) => {
          if (ribbon.id !== event.payload.ribbon.id) return ribbon;
          return {
            ...ribbon,
            status: "saved",
          };
        }),
      };
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
    case "setPhase":
      return {
        ...state,
        phase: event.payload,
        enqueuedRibbons:
          event.payload === "ribbon-detection" ? [] : state.enqueuedRibbons,
        focusedRibbonId: null,
        focusedSliceIndex: -1,
      };
    case "setReferencePoints":
      return { ...state, referencePoints: event.payload };
    case "setDetection":
      return { ...state, detection: event.payload };
    case "setDetectionLoading":
      return { ...state, detectionLoading: event.payload };
    case "setCornerValidation":
      return { ...state, cornerValidation: event.payload };
    case "setCorners":
      return { ...state, corners: event.payload };
    case "setCornerPhase":
      return { ...state, cornerPhase: event.payload };
    case "setContours":
      return { ...state, contours: event.payload };
    case "setMasks":
      return {
        ...state,
        masks: event.payload,
        currentMaskIndex: event.payload.length > 0 ? 0 : -1,
        ribbons: state.ribbons.map((r) => ({
          ...r,
          allowDetectAgain: false,
        })),
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
        referencePoints: [],
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
        if (
          ribbon.slicesToConfigure.includes(ribbon.slices[i].id) ||
          ribbon.slicesToMove.includes(ribbon.slices[i].id)
        )
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
        if (
          ribbon.slicesToConfigure.includes(ribbon.slices[i].id) ||
          ribbon.slicesToMove.includes(ribbon.slices[i].id)
        )
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
    case "setSlicesToMove": {
      const { focusedRibbonId } = state;
      if (focusedRibbonId === null) return state;
      return {
        ...state,
        ribbons: state.ribbons.map((ribbon) => {
          if (ribbon.id !== focusedRibbonId) return ribbon;
          return {
            ...ribbon,
            slicesToMove: event.payload,
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
            configurations: ribbon.slices.map((slice, index) => ({
              id: slice.id,
              paramsTouched: false,
              index,
              brightness: event.payload.brightness,
              contrast: event.payload.contrast,
              focus: event.payload.focus,
              point: computeStageCoordinates({
                point: ribbon.matchedPoints[index],
                canvasConfiguration: event.payload.canvas,
                stageConfiguration: event.payload.stage,
              }),
            })),
          };
        }),
      };
    case "updateSliceConfiguration": {
      const { brightness, contrast, focus, point } = event.payload;
      const { focusedRibbonId, focusedSliceIndex } = state;
      if (focusedRibbonId === null || focusedSliceIndex === -1) return state;
      return {
        ...state,
        ribbons: state.ribbons.map((ribbon) => {
          if (ribbon.id !== focusedRibbonId) return ribbon;
          return {
            ...ribbon,
            configurations: ribbon.configurations.map((config, idx) => {
              if (idx !== focusedSliceIndex && config.paramsTouched)
                return config;
              if (idx > focusedRibbonId && (brightness || contrast || focus)) {
                return {
                  ...config,
                  brightness: brightness ?? config.brightness,
                  contrast: contrast ?? config.contrast,
                  focus: focus ?? config.focus,
                };
              }
              return {
                ...config,
                paramsTouched:
                  config.paramsTouched ||
                  Boolean(brightness || contrast || focus),
                brightness: brightness ?? config.brightness,
                contrast: contrast ?? config.contrast,
                focus: focus ?? config.focus,
                point: [
                  point?.x ?? config.point[0],
                  point?.y ?? config.point[1],
                ],
              };
            }),
          };
        }),
      };
    }
  }
};
