# THE VOID

A real-time collaborative infinite canvas where every stroke is permanent and every presence is temporary. Built with Next.js 16, React 19, Socket.IO, and SQLite.

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.2.2 | App framework (App Router) |
| React | 19.2.4 | UI rendering |
| Socket.IO | 4.8.3 | Real-time WebSocket communication |
| better-sqlite3 | 12.8.0 | Persistent stroke storage (WAL mode) |
| Tailwind CSS | 4.x | Utility-first styling |
| Canvas 2D API | — | Stroke rendering with quadratic Bézier interpolation |
| TypeScript | 5.x | Type safety throughout |

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dev server uses `tsx` to run the custom server entry point directly.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server via `npx tsx server.ts` |
| `npm run build` | Build Next.js for production |
| `npm run start` | Start production server (`NODE_ENV=production`) |
| `npm run lint` | Run ESLint |

---

## Architecture Overview

The app is a custom Next.js server that wraps both the Next.js request handler and a Socket.IO WebSocket server in a single HTTP process. Strokes are persisted to a local SQLite database and broadcast to all connected clients in real time.

```
┌─────────────────────────────────────────────────────────┐
│  server.ts (entry point)                                │
│  ├── HTTP Server                                        │
│  │   ├── Next.js Request Handler (pages, assets)        │
│  │   └── Socket.IO WebSocket Server                     │
│  ├── SQLite Init (data/canvas.db)                       │
│  └── server/socket-handlers.ts (event registration)     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Client (browser)                                       │
│  ├── InfiniteCanvas (orchestrator)                      │
│  │   ├── useSocket ──── Socket.IO connection            │
│  │   ├── useCanvasView ── pan / zoom / pinch            │
│  │   ├── useDrawing ──── stroke lifecycle               │
│  │   └── useKeyboardShortcuts ── hotkeys                │
│  ├── canvas-renderer ── requestAnimationFrame loop      │
│  └── Toolbar / CursorsLayer / TextInput / overlays      │
└─────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
.
├── server.ts                    # Entry point — HTTP + Next.js + Socket.IO
├── server/
│   └── socket-handlers.ts       # Socket.IO event handlers
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout (Newsreader font, viewport meta)
│   │   ├── page.tsx             # Single page — renders InfiniteCanvas
│   │   ├── globals.css          # Theme variables, glass-panel, animations, grain
│   │   └── icon.svg             # Favicon (void portal)
│   ├── components/
│   │   ├── InfiniteCanvas.tsx   # Main orchestrator (~220 lines)
│   │   ├── Toolbar.tsx          # Bottom bar — tools, colors, sizes, presence
│   │   ├── CursorsLayer.tsx     # Remote user cursor rendering
│   │   ├── TextInput.tsx        # Floating textarea overlay
│   │   ├── HeroOverlay.tsx      # Ambient center text
│   │   └── AmbientGlow.tsx      # Decorative background glow
│   ├── hooks/
│   │   ├── useSocket.ts         # WebSocket connection, stroke sync, cursors
│   │   ├── useCanvasView.ts     # Pan, zoom, pinch, coordinate transforms
│   │   ├── useDrawing.ts        # Stroke creation, point deduplication
│   │   └── useKeyboardShortcuts.ts  # D/T/Space hotkeys
│   └── lib/
│       ├── types.ts             # Barrel re-export (backward compat)
│       ├── types/
│       │   ├── geometry.ts      # Point, ViewState
│       │   ├── strokes.ts       # DrawStroke, TextStroke, Stroke
│       │   ├── canvas.ts        # Tool, CursorData
│       │   ├── constants.ts     # COLORS, BRUSH_SIZES, FONT_SIZES, ZOOM_*
│       │   └── index.ts         # Barrel re-export
│       ├── canvas-renderer.ts   # Pure rendering functions (Bézier, grid, text)
│       └── db.ts                # SQLite persistence layer
├── data/
│   └── canvas.db                # SQLite database (auto-created, WAL mode)
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── eslint.config.mjs
```

---

## Server

### `server.ts`

Slim entry point (~32 lines). Creates a Node.js HTTP server, attaches both the Next.js request handler and a Socket.IO server, initializes the SQLite database, then delegates all socket event logic to `registerSocketHandlers()`.

```ts
// Simplified flow
const httpServer = createServer((req, res) => handle(req, res));
const io = new SocketIOServer(httpServer, { cors: { origin: "*" }, maxHttpBufferSize: 5e6 });
initDb();
registerSocketHandlers(io, { connectedUsers: 0, serverStartedAt: Date.now() });
httpServer.listen(port);
```

Socket.IO is configured with:
- `cors: { origin: "*" }` — accepts connections from any origin
- `maxHttpBufferSize: 5MB` — supports large stroke payloads

### `server/socket-handlers.ts`

Registers all Socket.IO event handlers:

| Event | Direction | Description |
|---|---|---|
| `connection` | server ← client | Sends all existing strokes + uptime, broadcasts user count |
| `stroke:add` | server ← client | Validates, persists to SQLite, broadcasts to others |
| `stroke:delete` | server ← client | Deletes from DB, broadcasts to others |
| `cursor:move` | server ← client | Attaches socket ID, broadcasts position to others |
| `disconnect` | server ← client | Decrements user count, removes cursor |

### `src/lib/db.ts`

SQLite persistence via `better-sqlite3` with WAL journal mode. Single `strokes` table:

```sql
CREATE TABLE IF NOT EXISTS strokes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  data TEXT NOT NULL,    -- JSON-serialized stroke payload
  created_at INTEGER DEFAULT (unixepoch())
)
```

Exported functions: `initDb()`, `getAllStrokes()`, `addStroke()`, `deleteStroke()`, `clearAll()`.

The database file lives at `data/canvas.db` and is auto-created on first run.

---

## Client Components

### `InfiniteCanvas.tsx` — Orchestrator

The main component (~220 lines). Wires together all hooks and child components. Does no state management itself — it delegates to specialized hooks and reads from refs for the render loop.

**Render pipeline** (runs every frame via `requestAnimationFrame`):
1. Clear canvas
2. Draw dot grid (screen space)
3. Apply camera transform (`setTransform` with `ViewState`)
4. Render all persisted strokes
5. Render current in-progress stroke

**Input handling:**
- Pointer events → dispatched to pan, draw, or text based on active tool
- Middle-click → always pans regardless of tool
- Two-finger touch → pinch zoom
- Wheel → zoom centered on cursor
- Registered with `{ passive: false }` to prevent default scroll

**Layer stack** (bottom to top):
1. `AmbientGlow` — decorative blurs
2. `<canvas>` — the actual drawing surface
3. `HeroOverlay` — ambient center typography
4. `CursorsLayer` — remote user cursors
5. `TextInput` — floating textarea (when active)
6. Film grain overlay (CSS `feTurbulence` noise)
7. `Toolbar` — fixed bottom bar

### `Toolbar.tsx`

Fixed-position bottom bar with CSS-only hover-reveal flyout menus.

**Sections:**
- **Tool selector**: Draw / Text / Pan with SVG icons. Hover to reveal flyout.
- **Color picker**: 10-swatch vertical flyout with active glow indicator
- **Size selector**: Brush sizes (draw mode) or font sizes (text mode)
- **Presence**: Connected user count as "N Minds Breathing" with pulse animation
- **Uptime**: Live server uptime ticker (receives initial time from server, ticks locally)
- **Zoom**: Current zoom percentage display

Uses a `.hover-bridge` pattern to prevent the flyout from closing when hovering between trigger and menu.

### `CursorsLayer.tsx`

Renders remote user cursors as absolutely-positioned SVG arrows. Converts canvas-space cursor coordinates to screen-space using the current `ViewState`. Each cursor has a color-matched glow dot and a museum-style label showing the first 6 chars of the socket ID. Position changes are interpolated with `120ms ease-out` CSS transitions.

### `TextInput.tsx`

A floating `<textarea>` overlay positioned at the click location (screen coordinates). Font size is scaled by the current zoom level. Submits on `Enter`, cancels on `Escape`, also submits on `blur`. Stops propagation on keydown to prevent keyboard shortcuts from firing while typing.

### `HeroOverlay.tsx` / `AmbientGlow.tsx`

Pure presentational components. `HeroOverlay` renders ambient center text at very low opacity ("The Void is Our Shared Breath"). `AmbientGlow` renders three decorative blur elements providing atmospheric cobalt lighting. Both have `pointer-events: none`.

---

## Hooks

### `useSocket()`

Manages the Socket.IO connection lifecycle. On connect, receives all existing strokes (`canvas:init`) and populates both a mutable ref (for the render loop) and React state. Handles real-time events:

- `stroke:add` — appends to local store
- `cursor:move` / `cursor:remove` — updates cursor map
- `users:count` / `server:uptime` — UI metadata

`emitStroke()` does optimistic local append before emitting to the server — the stroke appears immediately for the drawing user without waiting for a round trip.

### `useCanvasView()`

All viewport logic: pan (drag), zoom (wheel), and pinch (two-finger touch).

- Maintains both `viewRef` (mutable, read by render loop) and `view` state (triggers React re-renders for UI elements like zoom percentage)
- `screenToCanvas(sx, sy)` — inverse transform from screen pixels to canvas coordinates
- `zoomAtPoint(cx, cy, delta)` — zoom centered on cursor position, clamped to `[0.05, 10]`
- Pinch zoom tracks two-finger distance + midpoint for combined zoom + pan

### `useDrawing()`

Stroke creation lifecycle: `startStroke()` → `continueStroke()` → `endStroke()`.

- All screen coordinates are converted to canvas space via injected `screenToCanvas` callback
- Point deduplication: skips points closer than 2px (squared distance check) to reduce payload size
- On `endStroke()`, creates a `DrawStroke` with a UUID and calls `onStrokeComplete`
- `submitText()` creates a `TextStroke` at a given canvas position

### `useKeyboardShortcuts()`

Simple keyboard bindings: `D` → draw, `T` → text, `Space` → pan. Guards against textarea/input focus and key repeat.

---

## Type System

Types are organized into focused modules under `src/lib/types/`:

| Module | Exports |
|---|---|
| `geometry.ts` | `Point { x, y }`, `ViewState { offsetX, offsetY, scale }` |
| `strokes.ts` | `DrawStroke`, `TextStroke`, `Stroke` (discriminated union via `type` field) |
| `canvas.ts` | `Tool` (`"draw" \| "text" \| "pan"`), `CursorData { id, x, y, color }` |
| `constants.ts` | `COLORS` (10), `BRUSH_SIZES` (5), `FONT_SIZES` (4), `MIN_POINT_DISTANCE_SQ`, `ZOOM_LIMITS`, `ZOOM_FACTOR` |

A barrel re-export at `src/lib/types.ts` allows all consumers to use `import { ... } from "@/lib/types"`.

---

## Rendering

`src/lib/canvas-renderer.ts` contains pure functions with no React dependencies:

- **`drawSmoothPath(ctx, points, color, width)`** — Quadratic Bézier interpolation through midpoints. For each pair of consecutive points, draws a curve through the midpoint of the segment using the actual points as control points. This produces smooth, organic-looking strokes without the jitter of straight line segments.

- **`drawGrid(ctx, view, width, height)`** — Dot grid at 40px intervals. Fades out below `scale < 0.3` and disappears entirely when dots would be smaller than 8px. Drawn in screen space.

- **`renderStroke(ctx, stroke)`** — Dispatches to `drawSmoothPath` for draw strokes or multi-line text rendering for text strokes. Text uses the `Newsreader` font with 1.2× line height.

- **`renderCanvas(...)`** — Full render pass: clear → grid → transform → all strokes → current in-progress stroke. DPR-aware via `devicePixelRatio`.

---

## Design System

The visual identity is called **"The Curated Void"** — a minimal dark aesthetic.

| Token | Value | Usage |
|---|---|---|
| `--surface` | `#131313` | Base background |
| `--primary` | `#2e5bff` | Cobalt accent |
| `--primary-glow` | `#2e5bff33` | Glow effects |
| Font | Newsreader (Google Fonts) | Sole typeface, weights 200–700 |

Key CSS features in `globals.css`:
- **Film grain**: SVG `feTurbulence` noise at 3% opacity
- **Glass panel**: `backdrop-filter: blur(12px)` with 8% white border
- **Animations**: `fade-in-up`, `scale-in`, `float-in-right` with cubic-bezier easing
- **Tool reveal**: CSS-only hover flyout pattern with bridge element

---

## Deployment

### General

The app runs as a single Node.js process serving both HTTP (Next.js) and WebSocket (Socket.IO) on the same port. No separate WebSocket server is needed.

**Build & run:**

```bash
npm run build
NODE_ENV=production npx tsx server.ts
```

**Environment variables:**

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | — | Set to `production` for optimized builds |

**Persistent data:**

The SQLite database is stored at `data/canvas.db` (auto-created). This directory must be writable and should be persisted across deployments if you want to keep existing strokes.

**System requirements:**
- Node.js 20+
- ~50MB RAM at idle (grows with connected users)
- `better-sqlite3` requires native compilation — ensure `node-gyp` build tools are available (Python 3, C++ compiler)

### Docker

```dockerfile
FROM node:20-slim

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production

# Persist the SQLite database
VOLUME ["/app/data"]

CMD ["npx", "tsx", "server.ts"]
```

### Deploy on Coolify

[Coolify](https://coolify.io) is a self-hosted PaaS. The app works well with Coolify since it's a single-process Node.js server.

#### Option 1: Nixpacks (Recommended)

Coolify auto-detects Node.js projects via Nixpacks. Push your repo and configure:

1. **Create a new resource** → select your Git repository
2. **Build Pack**: Nixpacks (default)
3. **Settings**:
   - **Build Command**: `npm run build`
   - **Start Command**: `NODE_ENV=production npx tsx server.ts`
   - **Port**: `3000`
4. **Persistent Storage**:
   - Add a volume mount: **Source** `/data/the-void` → **Destination** `/app/data`
   - This persists the SQLite database across redeployments
5. **Environment Variables**:
   - `NODE_ENV` = `production`
   - `PORT` = `3000`

#### Option 2: Dockerfile

1. Add the Dockerfile above to your repo root
2. **Create a new resource** → select your Git repository
3. **Build Pack**: Dockerfile
4. **Persistent Storage**:
   - Mount: **Source** `/data/the-void` → **Destination** `/app/data`
5. **Port**: `3000`

#### Important Notes for Coolify

- **WebSocket support**: Coolify's built-in Traefik proxy supports WebSockets out of the box. No extra configuration needed — Socket.IO will automatically upgrade from polling to WebSocket.
- **Health checks**: The app responds to standard HTTP requests on `/` so default health checks work.
- **Single instance only**: Since the app uses SQLite (file-based), do **not** scale to multiple instances. Use a single container. If you need horizontal scaling, you'd need to replace SQLite with PostgreSQL and add a Redis adapter for Socket.IO.
- **Persistent storage is critical**: Without a volume mount for `/app/data`, every redeployment wipes all strokes. Always configure persistent storage.
- **Native dependencies**: `better-sqlite3` compiles native C++ bindings. Nixpacks handles this automatically. If using a custom Dockerfile, ensure build tools (`python3`, `make`, `g++`) are installed.

---

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
