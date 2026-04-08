"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { Stroke, CursorData } from "@/lib/types";

export interface SocketState {
  strokes: Stroke[];
  userCount: number;
  serverUptime: number | null;
  serverUptimeReceivedAt: number;
  cursors: Map<string, CursorData>;
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const strokesRef = useRef<Stroke[]>([]);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [serverUptime, setServerUptime] = useState<number | null>(null);
  const [serverUptimeReceivedAt, setServerUptimeReceivedAt] = useState(0);
  const [cursors, setCursors] = useState<Map<string, CursorData>>(new Map());

  useEffect(() => {
    const socket = io({ transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("canvas:init", (data: Stroke[]) => {
      strokesRef.current = data;
      setStrokes([...data]);
    });

    socket.on("server:uptime", (uptimeMs: number) => {
      setServerUptime(uptimeMs);
      setServerUptimeReceivedAt(Date.now());
    });

    socket.on("stroke:add", (stroke: Stroke) => {
      strokesRef.current = [...strokesRef.current, stroke];
      setStrokes([...strokesRef.current]);
    });

    socket.on("users:count", (count: number) => {
      setUserCount(count);
    });

    socket.on("cursor:move", (data: CursorData) => {
      setCursors((prev) => {
        const next = new Map(prev);
        next.set(data.id, data);
        return next;
      });
    });

    socket.on("cursor:remove", (id: string) => {
      setCursors((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const emitStroke = useCallback((stroke: Stroke) => {
    strokesRef.current = [...strokesRef.current, stroke];
    setStrokes([...strokesRef.current]);
    socketRef.current?.emit("stroke:add", stroke);
  }, []);

  const emitCursor = useCallback((x: number, y: number, color: string) => {
    socketRef.current?.emit("cursor:move", { x, y, color });
  }, []);

  return {
    strokesRef,
    strokes,
    userCount,
    serverUptime,
    serverUptimeReceivedAt,
    cursors,
    emitStroke,
    emitCursor,
  };
}
