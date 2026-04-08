"use client";

import { CursorData, ViewState } from "@/lib/types";

interface CursorsLayerProps {
  cursors: Map<string, CursorData>;
  view: ViewState;
}

export default function CursorsLayer({ cursors, view }: CursorsLayerProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {Array.from(cursors.values()).map((cursor) => {
        const sx = cursor.x * view.scale + view.offsetX;
        const sy = cursor.y * view.scale + view.offsetY;
        return (
          <div
            key={cursor.id}
            className="absolute transition-all duration-[120ms] ease-out group/cursor"
            style={{
              left: sx,
              top: sy,
              transform: "translate(-2px, -2px)",
            }}
          >
            {/* Cursor arrow — thin stroke, no fill weight */}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M3 3L10 17L12 10L19 8L3 3Z"
                fill={cursor.color}
                stroke="rgba(0,0,0,0.5)"
                strokeWidth="0.5"
                strokeLinejoin="round"
              />
            </svg>
            {/* Presence glow dot */}
            <div
              className="absolute top-0 left-0 w-2 h-2 rounded-full blur-[3px]"
              style={{ backgroundColor: cursor.color, opacity: 0.5 }}
            />
            {/* Name label — appears on proximity, museum-style */}
            <div
              className="absolute left-5 top-5 px-2.5 py-1 rounded-sm opacity-80 whitespace-nowrap"
              style={{
                background: "var(--surface-container)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--on-surface)",
                fontSize: "8px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontFamily: "var(--font-display), Georgia, serif",
              }}
            >
              {cursor.id.slice(0, 6)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
