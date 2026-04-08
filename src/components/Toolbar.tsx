"use client";

import { useState, useEffect } from "react";
import { COLORS, BRUSH_SIZES } from "@/lib/types";

interface ToolbarProps {
  tool: "draw" | "text" | "pan";
  setTool: (t: "draw" | "text" | "pan") => void;
  color: string;
  setColor: (c: string) => void;
  brushSize: number;
  setBrushSize: (s: number) => void;
  fontSize: number;
  setFontSize: (s: number) => void;
  onResetView: () => void;
  userCount: number;
  scale: number;
  serverUptime: number | null;
  serverUptimeReceivedAt: number;
}

const TOOL_LABELS: Record<string, string> = {
  draw: "DRAW",
  text: "TYPE",
  pan: "MOVE",
};

function useServerUptime(baseUptime: number | null, receivedAt: number) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (baseUptime === null) return;
    // Immediately show the uptime we received, then tick locally
    setElapsed(baseUptime);
    const id = setInterval(() => {
      setElapsed(baseUptime + (Date.now() - receivedAt));
    }, 1000);
    return () => clearInterval(id);
  }, [baseUptime, receivedAt]);

  const hrs = Math.floor(elapsed / 3600000);
  const mins = Math.floor((elapsed % 3600000) / 60000);
  const secs = Math.floor((elapsed % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

export default function Toolbar({
  tool,
  setTool,
  color,
  setColor,
  brushSize,
  setBrushSize,
  fontSize,
  setFontSize,
  onResetView,
  userCount,
  scale,
  serverUptime,
  serverUptimeReceivedAt,
}: ToolbarProps) {
  const uptime = useServerUptime(serverUptime, serverUptimeReceivedAt);

  return (
    <>
      {/* Top left — Brand */}
      <nav className="fixed top-0 left-0 w-full z-40 flex justify-between items-center px-6 py-5 sm:px-12 sm:py-8 pointer-events-none animate-fade-in">
        <div
          className="text-lg sm:text-2xl italic tracking-tighter opacity-40 pointer-events-auto"
          style={{ fontFamily: "var(--font-display), serif", color: "var(--on-surface)" }}
        >
          THE VOID
        </div>
      </nav>

      {/* Corner brackets — fine detail (desktop only) */}
      <div className="fixed inset-0 pointer-events-none z-20 hidden sm:block">
        <div className="absolute top-8 left-8 w-5 h-5 border-t border-l opacity-10" style={{ borderColor: "var(--on-surface)" }} />
        <div className="absolute bottom-8 right-8 w-5 h-5 border-b border-r opacity-10" style={{ borderColor: "var(--on-surface)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-px opacity-[0.04]" style={{ background: "var(--on-surface)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-px opacity-[0.04]" style={{ background: "var(--on-surface)" }} />
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="fixed bottom-3 left-3 right-3 sm:bottom-10 sm:left-10 sm:right-10 z-40 flex justify-between items-end animate-fade-in-up">

        {/* ── Left group: Tools + color + sizes + presence ── */}
        <div className="flex items-center gap-2 sm:gap-5">

          {/* Tool trigger with hover-reveal */}
          <div className="tool-group relative">
            <div className="hover-bridge" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 flex flex-col gap-1.5 p-2 glass-panel rounded-2xl tool-reveal">
              {/* Draw — brush/pen icon */}
              <ToolRevealBtn active={tool === "draw"} onClick={() => setTool("draw")} title="Draw (D)">
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18.37 2.63a2.12 2.12 0 013 3L14 13l-4 1 1-4 7.37-7.37z" />
                  <path d="M3 17c.5 2.5 2 4.5 4.5 5a12.3 12.3 0 004.5-.5c1-.5 2-1.5 2-1.5" opacity="0.5" />
                </svg>
              </ToolRevealBtn>
              {/* Text — T cursor/type icon */}
              <ToolRevealBtn active={tool === "text"} onClick={() => setTool("text")} title="Text (T)">
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 7 4 4 20 4 20 7" />
                  <line x1="9.5" y1="20" x2="14.5" y2="20" />
                  <line x1="12" y1="4" x2="12" y2="20" />
                </svg>
              </ToolRevealBtn>
              {/* Pan — arrows/move icon */}
              <ToolRevealBtn active={tool === "pan"} onClick={() => setTool("pan")} title="Pan (Space)">
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="5 9 2 12 5 15" />
                  <polyline points="9 5 12 2 15 5" />
                  <polyline points="15 19 12 22 9 19" />
                  <polyline points="19 9 22 12 19 15" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <line x1="12" y1="2" x2="12" y2="22" />
                </svg>
              </ToolRevealBtn>
            </div>

            <button
              className="h-10 sm:h-12 px-5 sm:px-6 rounded-2xl flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300"
              style={{ background: "var(--on-surface)", color: "var(--surface)" }}
              title="Tools"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round">
                <circle cx="12" cy="12" r="9.5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </button>
          </div>

          {/* Color trigger */}
          <div className="tool-group relative">
            <div className="hover-bridge" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 glass-panel rounded-full p-2 tool-reveal">
              <div className="flex flex-col gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                    style={{ background: color === c ? "rgba(255,255,255,0.1)" : "transparent" }}
                    title={c}
                  >
                    <span
                      className="w-4 h-4 rounded-full transition-all"
                      style={{
                        backgroundColor: c,
                        boxShadow: color === c ? `0 0 10px ${c}60` : "none",
                        transform: color === c ? "scale(1.2)" : "scale(1)",
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
            <button
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
              style={{ background: "var(--surface-container-high)" }}
              title="Colors"
            >
              <span
                className="w-3 h-3 sm:w-4 sm:h-4 rounded-full"
                style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}40` }}
              />
            </button>
          </div>

          {/* Size controls — desktop only */}
          {tool === "draw" && (
            <div className="hidden sm:flex items-center gap-1 glass-panel rounded-full px-3 h-12 animate-fade-in">
              {BRUSH_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setBrushSize(s)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    background: brushSize === s ? "rgba(184, 195, 255, 0.08)" : "transparent",
                    color: brushSize === s ? "var(--primary)" : "var(--outline)",
                  }}
                  title={`Size ${s}`}
                >
                  <span className="rounded-full bg-current" style={{ width: Math.min(s + 1, 14), height: Math.min(s + 1, 14) }} />
                </button>
              ))}
            </div>
          )}
          {tool === "text" && (
            <div className="hidden sm:flex items-center gap-1 glass-panel rounded-full px-3 h-12 animate-fade-in">
              {[16, 24, 36, 48].map((s) => (
                <button
                  key={s}
                  onClick={() => setFontSize(s)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    background: fontSize === s ? "rgba(184, 195, 255, 0.08)" : "transparent",
                    color: fontSize === s ? "var(--primary)" : "var(--outline)",
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                  }}
                  title={`${s}px`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Divider — desktop only */}
          <div className="hidden sm:block h-4 w-px opacity-10" style={{ background: "var(--on-surface)" }} />

          {/* Presence pulse — desktop only */}
          <div className="hidden sm:flex glass-panel h-12 px-5 rounded-full items-center gap-4">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: "var(--primary)", boxShadow: "0 0 8px var(--primary)" }}
            />
            <span className="text-[9px] uppercase tracking-[0.25em] whitespace-nowrap" style={{ color: "var(--outline)" }}>
              {userCount} {userCount === 1 ? "Mind" : "Minds"} Breathing
            </span>
          </div>
        </div>

        {/* ── Right group: Status info ── */}
        <div className="glass-panel h-10 sm:h-12 px-4 sm:px-8 rounded-full flex items-center gap-3 sm:gap-8">
          {/* Session timer */}
          <div className="text-right">
            <div className="text-[8px] uppercase tracking-[0.2em]" style={{ color: "var(--outline)" }}>Uptime</div>
            <div className="text-[10px] tracking-[0.15em] flex items-center gap-1.5 justify-end tabular-nums" style={{ color: "var(--on-surface)" }}>
              <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: "var(--primary)" }} />
              {uptime}
            </div>
          </div>
          <div className="w-px h-5 opacity-10" style={{ background: "var(--on-surface)" }} />
          {/* Tool */}
          <div className="text-right">
            <div className="text-[8px] uppercase tracking-[0.2em]" style={{ color: "var(--outline)" }}>Tool</div>
            <div className="text-[10px] tracking-[0.15em]" style={{ color: "var(--on-surface)" }}>
              {TOOL_LABELS[tool]}
            </div>
          </div>
          {/* Zoom — desktop only */}
          <div className="w-px h-5 opacity-10 hidden sm:block" style={{ background: "var(--on-surface)" }} />
          <button onClick={onResetView} className="text-right group hidden sm:block">
            <div className="text-[8px] uppercase tracking-[0.2em]" style={{ color: "var(--outline)" }}>Zoom</div>
            <div className="text-[10px] tracking-[0.15em] group-hover:opacity-70 transition-opacity" style={{ color: "var(--on-surface)" }}>
              {Math.round(scale * 100)}%
            </div>
          </button>
        </div>
      </div>
    </>
  );
}

function ToolRevealBtn({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:bg-white/10"
      style={{
        color: active ? "var(--primary)" : "var(--outline)",
        background: active ? "rgba(184, 195, 255, 0.08)" : "transparent",
      }}
    >
      {children}
    </button>
  );
}
