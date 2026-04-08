import { Server as SocketIOServer, Socket } from "socket.io";
import { getAllStrokes, addStroke, deleteStroke } from "../src/lib/db";

interface ServerState {
  connectedUsers: number;
  serverStartedAt: number;
}

export function registerSocketHandlers(io: SocketIOServer, state: ServerState) {
  io.on("connection", (socket: Socket) => {
    state.connectedUsers++;
    io.emit("users:count", state.connectedUsers);

    socket.emit("server:uptime", Date.now() - state.serverStartedAt);

    const strokes = getAllStrokes();
    socket.emit("canvas:init", strokes);

    socket.on("stroke:add", (stroke) => {
      if (!stroke || !stroke.id || !stroke.type) return;
      addStroke(stroke);
      socket.broadcast.emit("stroke:add", stroke);
    });

    socket.on("stroke:delete", (id: string) => {
      if (!id || typeof id !== "string") return;
      deleteStroke(id);
      socket.broadcast.emit("stroke:delete", id);
    });

    socket.on("cursor:move", (data) => {
      socket.broadcast.emit("cursor:move", {
        ...data,
        id: socket.id,
      });
    });

    socket.on("disconnect", () => {
      state.connectedUsers--;
      io.emit("users:count", state.connectedUsers);
      io.emit("cursor:remove", socket.id);
    });
  });
}
