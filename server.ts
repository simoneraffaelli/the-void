import { createServer } from "http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { initDb } from "./src/lib/db";
import { registerSocketHandlers } from "./server/socket-handlers";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
    maxHttpBufferSize: 5e6,
  });

  initDb();

  registerSocketHandlers(io, {
    connectedUsers: 0,
    serverStartedAt: new Date(2026,3,8,22,27,17).getTime(),
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
