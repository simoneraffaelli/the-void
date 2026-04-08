import type { Point } from "./geometry";

export interface DrawStroke {
  id: string;
  type: "draw";
  points: Point[];
  color: string;
  width: number;
}

export interface TextStroke {
  id: string;
  type: "text";
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

export type Stroke = DrawStroke | TextStroke;
