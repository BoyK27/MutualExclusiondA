/**
 * ============================================================
 *  OmniSync – Centralized Mutual Exclusion Backend
 *  Implements the classic Coordinator-based Mutex algorithm:
 *
 *    1. A client sends a REQUEST to the coordinator.
 *    2. If the critical section (CS) is free → GRANT immediately.
 *    3. If the CS is occupied → enqueue the client (FIFO queue).
 *    4. When the current holder finishes (auto-release after 3s)
 *       → dequeue the next client and GRANT it access.
 *    5. /coordinator/crash marks the coordinator as DOWN so all
 *       new requests are rejected (simulates single-point-of-failure).
 *    6. /reset wipes all state back to the initial blank slate.
 * ============================================================
 */

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

// ── Middleware ────────────────────────────────────────────────
// Parse JSON request bodies.
app.use(express.json());

// Allow cross-origin requests (needed when the HTML is opened
// directly as a file:// URL instead of through this server).
app.use(cors());

// ── Static Frontend ───────────────────────────────────────────
// Serve the GUI folder so opening http://localhost:5000 shows
// index.html — no separate Live Server required.
// path.join walks up one directory from /server to reach ME(GUI)/.
const path = require("path");
app.use(express.static(path.join(__dirname, "..", "ME(GUI)")));

// ── Coordinator State ─────────────────────────────────────────
// This object is the single source of truth for the entire simulation.
// It lives in memory; a process restart resets everything.
let state = createInitialState();

/** Returns a fresh, blank coordinator state. */
function createInitialState() {
  return {
    // The client currently inside the critical section, or null.
    currentHolder: null,

    // FIFO queue of client IDs waiting for the CS.
    waitingQueue: [],

    // Per-client status map  →  'IDLE' | 'IN_CRITICAL_SECTION' | 'WAITING'
    clients: {
      "Client-1": "IDLE",
      "Client-2": "IDLE",
      "Client-3": "IDLE",
    },

    // When true the coordinator has "crashed" and rejects all requests.
    crashed: false,

    // Handle for the auto-release timer so we can cancel it on reset.
    releaseTimer: null,
  };
}

// ── Helper: grant the CS to the next client in the queue ──────
/**
 * Pops the first client off the waiting queue and gives it
 * exclusive access to the critical section.
 * Also schedules an automatic RELEASE after 3 seconds so the
 * simulation keeps moving without manual interaction.
 */
function grantToNext() {
  if (state.waitingQueue.length === 0) return; // nothing to do

  const nextClient = state.waitingQueue.shift(); // FIFO dequeue
  state.currentHolder = nextClient;
  state.clients[nextClient] = "IN_CRITICAL_SECTION";

  console.log(`[Coordinator] GRANT → ${nextClient} (CS acquired)`);

  // Auto-release: after 3 seconds the client "leaves" the CS
  // and the coordinator checks the queue again.
  state.releaseTimer = setTimeout(() => {
    console.log(`[Coordinator] RELEASE ← ${nextClient} (CS freed)`);
    state.clients[nextClient] = "IDLE";
    state.currentHolder = null;
    state.releaseTimer = null;
    grantToNext(); // serve the next waiting client, if any
  }, 3000);
}

// ── Route: POST /api/client/:clientId/request ─────────────────
/**
 * A client asks the coordinator for permission to enter the CS.
 *
 * Response shape (success):
 *   { success: true, message: "...", data: { currentHolder, waitingQueue, clients } }
 *
 * Response shape (failure):
 *   { success: false, message: "..." }
 */
app.post("/api/client/:clientId/request", (req, res) => {
  const { clientId } = req.params;

  // Reject unknown clients (only Client-1, Client-2, Client-3 exist).
  if (!state.clients.hasOwnProperty(clientId)) {
    return res
      .status(400)
      .json({ success: false, message: `Unknown client: ${clientId}` });
  }

  // If the coordinator has crashed, no request can be served.
  if (state.crashed) {
    return res
      .status(503)
      .json({
        success: false,
        message: "Coordinator is DOWN. Reset to recover.",
      });
  }

  // If this client is already in the CS or already waiting, ignore duplicate request.
  if (state.clients[clientId] !== "IDLE") {
    return res
      .status(409)
      .json({
        success: false,
        message: `${clientId} is already ${state.clients[clientId]}`,
      });
  }

  console.log(`[Coordinator] REQUEST ← ${clientId}`);

  if (state.currentHolder === null) {
    // ── CS is FREE → grant immediately ──────────────────────
    state.clients[clientId] = "IN_CRITICAL_SECTION";
    state.currentHolder = clientId;

    console.log(`[Coordinator] GRANT → ${clientId} (immediate)`);

    // Schedule auto-release after 3 seconds.
    state.releaseTimer = setTimeout(() => {
      console.log(`[Coordinator] RELEASE ← ${clientId} (CS freed)`);
      state.clients[clientId] = "IDLE";
      state.currentHolder = null;
      state.releaseTimer = null;
      grantToNext();
    }, 3000);
  } else {
    // ── CS is BUSY → enqueue the client ─────────────────────
    state.waitingQueue.push(clientId);
    state.clients[clientId] = "WAITING";

    console.log(
      `[Coordinator] QUEUED  → ${clientId} (position ${state.waitingQueue.length})`,
    );
  }

  // Return the full current state so the frontend can re-render.
  res.json({
    success: true,
    message:
      state.currentHolder === clientId
        ? `GRANT: ${clientId} has entered the critical section.`
        : `QUEUED: ${clientId} is waiting (position ${state.waitingQueue.indexOf(clientId) + 1}).`,
    data: {
      currentHolder: state.currentHolder,
      waitingQueue: [...state.waitingQueue],
      clients: { ...state.clients },
    },
  });
});

// ── Route: POST /api/coordinator/crash ───────────────────────
/**
 * Simulates the coordinator node failing.
 * Sets the crashed flag; all future /request calls will be rejected.
 * Any pending release timer is left in place but becomes irrelevant
 * because the crashed coordinator can no longer process GRANTs.
 */
app.post("/api/coordinator/crash", (req, res) => {
  state.crashed = true;
  console.log("[Coordinator] *** CRASHED ***");

  res.json({
    success: true,
    message: "Coordinator has crashed. Single point of failure triggered.",
  });
});

// ── Route: POST /api/reset ────────────────────────────────────
/**
 * Resets everything to the initial blank slate.
 * Clears the auto-release timer so it doesn't fire after reset.
 */
app.post("/api/reset", (req, res) => {
  // Cancel any pending auto-release to prevent stale callbacks.
  if (state.releaseTimer) {
    clearTimeout(state.releaseTimer);
  }

  state = createInitialState();
  console.log("[Coordinator] System reset to initial state.");

  res.json({
    success: true,
    message: "System reset. All clients are IDLE.",
    data: {
      currentHolder: state.currentHolder,
      waitingQueue: [...state.waitingQueue],
      clients: { ...state.clients },
    },
  });
});

// ── Start the server ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  OmniSync Mutex Server running at http://localhost:${PORT}`);
  console.log(
    `  Open http://localhost:${PORT} in your browser to load the GUI.`,
  );
  console.log(`\n  API Endpoints:`);
  console.log(`    POST /api/client/:clientId/request`);
  console.log(`    POST /api/coordinator/crash`);
  console.log(`    POST /api/reset\n`);
});
