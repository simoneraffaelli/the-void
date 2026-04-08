import type { Point, ViewState, DrawStroke, TextStroke, Stroke } from "@/lib/types";

/**
 * Draw a smooth Bézier curve through a series of points.
 * Uses quadratic interpolation through midpoints for perfectly smooth joins.
 */
export function drawSmoothPath(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  width: number,
) {
  if (points.length < 2) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
  } else {
    for (let i = 1; i < points.length - 1; i++) {
      const mx = (points[i].x + points[i + 1].x) / 2;
      const my = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  ctx.stroke();
  ctx.restore();
}

/**
 * Draw the dot grid background, accounting for the current view transform.
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  view: ViewState,
  width: number,
  height: number,
) {
  const gridSize = 40 * view.scale;
  if (gridSize <= 8) return;

  const startX = view.offsetX % gridSize;
  const startY = view.offsetY % gridSize;
  ctx.fillStyle = view.scale > 0.3 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.015)";

  for (let x = startX; x < width; x += gridSize) {
    for (let y = startY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.arc(x, y, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Render a single stroke (draw or text) on the canvas.
 */
export function renderStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.type === "draw") {
    const ds = stroke as DrawStroke;
    if (ds.points.length < 2) return;
    drawSmoothPath(ctx, ds.points, ds.color, ds.width);
  } else if (stroke.type === "text") {
    const ts = stroke as TextStroke;
    ctx.save();
    ctx.font = `${ts.fontSize}px 'Newsreader', Georgia, serif`;
    ctx.fillStyle = ts.color;
    ctx.textBaseline = "top";
    const lines = ts.text.split("\n");
    lines.forEach((line, i) => {
      ctx.fillText(line, ts.x, ts.y + i * ts.fontSize * 1.2);
    });
    ctx.restore();
  }
}

/**
 * Full render pass: clear, draw grid, render all strokes, render in-progress stroke.
 */
export function renderCanvas(
  canvas: HTMLCanvasElement,
  view: ViewState,
  strokes: Stroke[],
  currentPoints: Point[],
  currentColor: string,
  currentWidth: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }

  // Clear
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Grid (screen space)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawGrid(ctx, view, w, h);

  // Strokes (canvas space)
  ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.offsetX, dpr * view.offsetY);

  for (const stroke of strokes) {
    renderStroke(ctx, stroke);
  }

  // Current stroke in progress
  if (currentPoints.length > 1) {
    drawSmoothPath(ctx, currentPoints, currentColor, currentWidth);
  }
}
