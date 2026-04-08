// Re-export from organized type modules
export type { Point, ViewState } from "./types/geometry";
export type { DrawStroke, TextStroke, Stroke } from "./types/strokes";
export type { Tool, CursorData } from "./types/canvas";
export {
  COLORS,
  BRUSH_SIZES,
  FONT_SIZES,
  MIN_POINT_DISTANCE_SQ,
  ZOOM_LIMITS,
  ZOOM_FACTOR,
} from "./types/constants";

