"use client";

import { RefObject } from "react";
import type { ViewState } from "@/lib/types";

interface TextInputProps {
  visible: boolean;
  screenX: number;
  screenY: number;
  fontSize: number;
  scale: number;
  color: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

export default function TextInput({
  visible,
  screenX,
  screenY,
  fontSize,
  scale,
  color,
  textareaRef,
  onSubmit,
  onCancel,
}: TextInputProps) {
  if (!visible) return null;

  return (
    <textarea
      ref={textareaRef}
      className="absolute z-50 glass-panel rounded-lg p-3 resize-none outline-none animate-scale-in"
      style={{
        left: screenX,
        top: screenY,
        fontSize: fontSize * scale,
        color,
        fontFamily: "var(--font-display), Georgia, serif",
        minWidth: 220,
        minHeight: 64,
        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
      }}
      placeholder="Type something..."
      autoFocus
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onSubmit(e.currentTarget.value);
          return;
        }
        if (e.key === "Escape") {
          onCancel();
        }
      }}
      onBlur={(e) => {
        onSubmit(e.currentTarget.value);
      }}
    />
  );
}
