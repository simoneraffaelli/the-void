"use client";

import { useEffect } from "react";

type Tool = "draw" | "text" | "pan";

interface UseKeyboardShortcutsProps {
  setTool: (t: Tool) => void;
}

export function useKeyboardShortcuts({ setTool }: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.repeat) return;

      if (e.key === "d" || e.key === "D") {
        setTool("draw");
      } else if (e.key === "t" || e.key === "T") {
        setTool("text");
      } else if (e.key === " ") {
        e.preventDefault();
        setTool("pan");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setTool]);
}
