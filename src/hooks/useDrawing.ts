"use client";

import { useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Point, DrawStroke, TextStroke } from "@/lib/types";
import { MIN_POINT_DISTANCE_SQ } from "@/lib/types";

interface UseDrawingOptions {
  getColor: () => string;
  getBrushSize: () => number;
  getFontSize: () => number;
  screenToCanvas: (sx: number, sy: number) => Point;
  onStrokeComplete: (stroke: DrawStroke | TextStroke) => void;
}

export function useDrawing({
  getColor,
  getBrushSize,
  getFontSize,
  screenToCanvas,
  onStrokeComplete,
}: UseDrawingOptions) {
  const currentStrokeRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);

  const startStroke = useCallback((screenPos: Point) => {
    isDrawingRef.current = true;
    const canvasPos = screenToCanvas(screenPos.x, screenPos.y);
    currentStrokeRef.current = [canvasPos];
  }, [screenToCanvas]);

  const continueStroke = useCallback((screenPos: Point) => {
    if (!isDrawingRef.current) return;

    const canvasPos = screenToCanvas(screenPos.x, screenPos.y);
    const pts = currentStrokeRef.current;

    if (pts.length > 0) {
      const last = pts[pts.length - 1];
      const dx = canvasPos.x - last.x;
      const dy = canvasPos.y - last.y;
      if (dx * dx + dy * dy < MIN_POINT_DISTANCE_SQ) return;
    }

    currentStrokeRef.current.push(canvasPos);
  }, [screenToCanvas]);

  const endStroke = useCallback(() => {
    if (!isDrawingRef.current) return;

    if (currentStrokeRef.current.length > 1) {
      const stroke: DrawStroke = {
        id: uuidv4(),
        type: "draw",
        points: currentStrokeRef.current,
        color: getColor(),
        width: getBrushSize(),
      };
      onStrokeComplete(stroke);
    }

    isDrawingRef.current = false;
    currentStrokeRef.current = [];
  }, [getColor, getBrushSize, onStrokeComplete]);

  const submitText = useCallback((text: string, canvasPos: Point) => {
    if (!text.trim()) return;

    const stroke: TextStroke = {
      id: uuidv4(),
      type: "text",
      text: text.trim(),
      x: canvasPos.x,
      y: canvasPos.y,
      color: getColor(),
      fontSize: getFontSize(),
    };
    onStrokeComplete(stroke);
  }, [getColor, getFontSize, onStrokeComplete]);

  return {
    currentStrokeRef,
    isDrawingRef,
    startStroke,
    continueStroke,
    endStroke,
    submitText,
  };
}
