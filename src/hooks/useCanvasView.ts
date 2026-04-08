"use client";

import { useRef, useState, useCallback } from "react";
import type { Point, ViewState } from "@/lib/types";
import { ZOOM_LIMITS, ZOOM_FACTOR } from "@/lib/types";

const DEFAULT_VIEW: ViewState = { offsetX: 0, offsetY: 0, scale: 1 };

export function useCanvasView() {
  const viewRef = useRef<ViewState>({ ...DEFAULT_VIEW });
  const [view, setView] = useState<ViewState>({ ...DEFAULT_VIEW });

  // Pan state
  const isPanningRef = useRef(false);
  const panStartRef = useRef<Point>({ x: 0, y: 0 });

  // Pinch zoom state
  const lastPinchDistRef = useRef<number | null>(null);
  const lastPinchCenterRef = useRef<Point | null>(null);

  const updateView = useCallback((next: ViewState) => {
    viewRef.current = next;
    setView({ ...next });
  }, []);

  const screenToCanvas = useCallback((sx: number, sy: number): Point => {
    const v = viewRef.current;
    return {
      x: (sx - v.offsetX) / v.scale,
      y: (sy - v.offsetY) / v.scale,
    };
  }, []);

  const resetView = useCallback(() => {
    updateView({ ...DEFAULT_VIEW });
  }, [updateView]);

  // --- Pan ---

  const startPan = useCallback((pos: Point) => {
    isPanningRef.current = true;
    panStartRef.current = pos;
  }, []);

  const movePan = useCallback((pos: Point): boolean => {
    if (!isPanningRef.current) return false;
    const dx = pos.x - panStartRef.current.x;
    const dy = pos.y - panStartRef.current.y;
    const v = viewRef.current;
    updateView({ ...v, offsetX: v.offsetX + dx, offsetY: v.offsetY + dy });
    panStartRef.current = pos;
    return true;
  }, [updateView]);

  const endPan = useCallback((): boolean => {
    if (!isPanningRef.current) return false;
    isPanningRef.current = false;
    return true;
  }, []);

  // --- Wheel zoom ---

  const zoomAtPoint = useCallback((mx: number, my: number, deltaY: number) => {
    const factor = deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
    const v = viewRef.current;
    const newScale = Math.min(Math.max(v.scale * factor, ZOOM_LIMITS.min), ZOOM_LIMITS.max);
    const newOffsetX = mx - (mx - v.offsetX) * (newScale / v.scale);
    const newOffsetY = my - (my - v.offsetY) * (newScale / v.scale);
    updateView({ offsetX: newOffsetX, offsetY: newOffsetY, scale: newScale });
  }, [updateView]);

  // --- Pinch zoom ---

  const startPinch = useCallback((touch0: Point, touch1: Point) => {
    const dx = touch0.x - touch1.x;
    const dy = touch0.y - touch1.y;
    lastPinchDistRef.current = Math.sqrt(dx * dx + dy * dy);
    lastPinchCenterRef.current = {
      x: (touch0.x + touch1.x) / 2,
      y: (touch0.y + touch1.y) / 2,
    };
  }, []);

  const movePinch = useCallback((touch0: Point, touch1: Point, canvasRect: DOMRect) => {
    if (lastPinchDistRef.current === null) return;

    const dx = touch0.x - touch1.x;
    const dy = touch0.y - touch1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const center = {
      x: (touch0.x + touch1.x) / 2,
      y: (touch0.y + touch1.y) / 2,
    };

    const mx = center.x - canvasRect.left;
    const my = center.y - canvasRect.top;

    const zoomFactor = dist / lastPinchDistRef.current;
    const v = viewRef.current;
    const newScale = Math.min(Math.max(v.scale * zoomFactor, ZOOM_LIMITS.min), ZOOM_LIMITS.max);

    const panDx = lastPinchCenterRef.current ? center.x - lastPinchCenterRef.current.x : 0;
    const panDy = lastPinchCenterRef.current ? center.y - lastPinchCenterRef.current.y : 0;

    const newOffsetX = mx - (mx - v.offsetX) * (newScale / v.scale) + panDx;
    const newOffsetY = my - (my - v.offsetY) * (newScale / v.scale) + panDy;

    updateView({ offsetX: newOffsetX, offsetY: newOffsetY, scale: newScale });

    lastPinchDistRef.current = dist;
    lastPinchCenterRef.current = center;
  }, [updateView]);

  const endPinch = useCallback(() => {
    lastPinchDistRef.current = null;
    lastPinchCenterRef.current = null;
  }, []);

  return {
    viewRef,
    view,
    screenToCanvas,
    resetView,
    startPan,
    movePan,
    endPan,
    isPanningRef,
    zoomAtPoint,
    startPinch,
    movePinch,
    endPinch,
  };
}
