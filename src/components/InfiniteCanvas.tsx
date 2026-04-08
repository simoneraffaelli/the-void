"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Point, Tool } from "@/lib/types";
import { COLORS, BRUSH_SIZES } from "@/lib/types";
import { renderCanvas } from "@/lib/canvas-renderer";
import { useSocket } from "@/hooks/useSocket";
import { useCanvasView } from "@/hooks/useCanvasView";
import { useDrawing } from "@/hooks/useDrawing";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import Toolbar from "./Toolbar";
import CursorsLayer from "./CursorsLayer";
import HeroOverlay from "./HeroOverlay";
import AmbientGlow from "./AmbientGlow";
import TextInput from "./TextInput";

export default function InfiniteCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  // Tool state
  const [tool, setTool] = useState<Tool>("draw");
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1]);
  const [fontSize, setFontSize] = useState(24);

  // Text input overlay position
  const [textInput, setTextInput] = useState<{
    screenX: number;
    screenY: number;
    canvasX: number;
    canvasY: number;
    visible: boolean;
  }>({ screenX: 0, screenY: 0, canvasX: 0, canvasY: 0, visible: false });

  // Stable refs for values used in callbacks
  const colorRef = useRef(color);
  const brushSizeRef = useRef(brushSize);
  const fontSizeRef = useRef(fontSize);
  colorRef.current = color;
  brushSizeRef.current = brushSize;
  fontSizeRef.current = fontSize;

  // My cursor color (random, stable across renders)
  const myCursorColor = useRef(COLORS[Math.floor(Math.random() * COLORS.length)]);

  // --- Hooks ---
  const {
    strokesRef,
    userCount,
    serverUptime,
    serverUptimeReceivedAt,
    cursors,
    emitStroke,
    emitCursor,
  } = useSocket();

  const {
    viewRef,
    view,
    screenToCanvas,
    resetView,
    startPan,
    movePan,
    endPan,
    zoomAtPoint,
    startPinch,
    movePinch,
    endPinch,
  } = useCanvasView();

  const { currentStrokeRef, startStroke, continueStroke, endStroke, submitText } = useDrawing({
    getColor: () => colorRef.current,
    getBrushSize: () => brushSizeRef.current,
    getFontSize: () => fontSizeRef.current,
    screenToCanvas,
    onStrokeComplete: emitStroke,
  });

  useKeyboardShortcuts({ setTool });

  // --- Render loop ---
  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      const canvas = canvasRef.current;
      if (canvas) {
        renderCanvas(
          canvas,
          viewRef.current,
          strokesRef.current,
          currentStrokeRef.current,
          colorRef.current,
          brushSizeRef.current,
        );
      }
      requestAnimationFrame(loop);
    };
    loop();
    return () => { running = false; };
  }, [viewRef, strokesRef, currentStrokeRef]);

  // --- Resize handler ---
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- Wheel zoom (passive: false) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoomAtPoint(e.clientX - rect.left, e.clientY - rect.top, e.deltaY);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [zoomAtPoint]);

  // --- Pointer position helper ---
  const getPointerPos = useCallback(
    (e: React.PointerEvent | React.TouchEvent): Point => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    },
    [],
  );

  // --- Pointer handlers ---
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const pos = getPointerPos(e);

      if (e.button === 1 || tool === "pan") {
        startPan(pos);
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      if (tool === "text") {
        e.preventDefault();
        const canvasPos = screenToCanvas(pos.x, pos.y);
        setTextInput({ screenX: pos.x, screenY: pos.y, canvasX: canvasPos.x, canvasY: canvasPos.y, visible: true });
        setTimeout(() => textInputRef.current?.focus(), 50);
        return;
      }

      if (tool === "draw") {
        startStroke(pos);
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    },
    [tool, getPointerPos, screenToCanvas, startPan, startStroke],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const pos = getPointerPos(e);

      const canvasPos = screenToCanvas(pos.x, pos.y);
      emitCursor(canvasPos.x, canvasPos.y, myCursorColor.current);

      if (movePan(pos)) return;
      continueStroke(pos);
    },
    [getPointerPos, screenToCanvas, emitCursor, movePan, continueStroke],
  );

  const handlePointerUp = useCallback(() => {
    if (endPan()) return;
    endStroke();
  }, [endPan, endStroke]);

  // --- Touch handlers for pinch ---
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length === 2) {
        startPinch(
          { x: e.touches[0].clientX, y: e.touches[0].clientY },
          { x: e.touches[1].clientX, y: e.touches[1].clientY },
        );
      }
    },
    [startPinch],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const rect = canvasRef.current!.getBoundingClientRect();
        movePinch(
          { x: e.touches[0].clientX, y: e.touches[0].clientY },
          { x: e.touches[1].clientX, y: e.touches[1].clientY },
          rect,
        );
      }
    },
    [movePinch],
  );

  // --- Text input handlers ---
  const handleTextSubmit = useCallback(
    (text: string) => {
      if (text.trim()) {
        submitText(text, { x: textInput.canvasX, y: textInput.canvasY });
      }
      setTextInput((p) => ({ ...p, visible: false }));
    },
    [submitText, textInput.canvasX, textInput.canvasY],
  );

  const handleTextCancel = useCallback(() => {
    setTextInput((p) => ({ ...p, visible: false }));
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: "var(--surface)" }}>
      <AmbientGlow />

      <div className="fixed inset-0 canvas-grain z-50" />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none"
        style={{ cursor: tool === "pan" ? "grab" : tool === "text" ? "text" : "url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%228%22 height=%228%22><circle cx=%224%22 cy=%224%22 r=%223%22 fill=%22white%22 stroke=%22black%22 stroke-width=%221%22/></svg>') 4 4, auto" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={endPinch}
      />

      <HeroOverlay />

      <CursorsLayer cursors={cursors} view={view} />

      <TextInput
        visible={textInput.visible}
        screenX={textInput.screenX}
        screenY={textInput.screenY}
        fontSize={fontSize}
        scale={view.scale}
        color={color}
        textareaRef={textInputRef}
        onSubmit={handleTextSubmit}
        onCancel={handleTextCancel}
      />

      <Toolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        brushSize={brushSize}
        setBrushSize={setBrushSize}
        fontSize={fontSize}
        setFontSize={setFontSize}
        onResetView={resetView}
        userCount={userCount}
        scale={view.scale}
        serverUptime={serverUptime}
        serverUptimeReceivedAt={serverUptimeReceivedAt}
      />
    </div>
  );
}
