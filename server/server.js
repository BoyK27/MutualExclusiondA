const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(express.json());

app.use(cors());

const path = require("path");
app.use(express.static(path.join(__dirname, "..", "ME(GUI)")));

// ── Coordinator State ─────────────────────────────────────────

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

function grantToNext() {
  if (state.waitingQueue.length === 0) return; // nothing to do

  const nextClient = state.waitingQueue.shift(); // FIFO dequeue
  state.currentHolder = nextClient;
  state.clients[nextClient] = "IN_CRITICAL_SECTION";

  console.log(`[Coordinator] GRANT → ${nextClient} (CS acquired)`);

  state.releaseTimer = setTimeout(() => {
    console.log(`[Coordinator] RELEASE ← ${nextClient} (CS freed)`);
    state.clients[nextClient] = "IDLE";
    state.currentHolder = null;
    state.releaseTimer = null;
    grantToNext(); // serve the next waiting client, if any
  }, 3000);
}

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
    return res.status(503).json({
      success: false,
      message: "Coordinator is DOWN. Reset to recover.",
    });
  }

  // If this client is already in the CS or already waiting, ignore duplicate request.
  if (state.clients[clientId] !== "IDLE") {
    return res.status(409).json({
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

app.post("/api/coordinator/crash", (req, res) => {
  state.crashed = true;
  console.log("[Coordinator] *** CRASHED ***");

  res.json({
    success: true,
    message: "Coordinator has crashed. Single point of failure triggered.",
  });
});

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

// Start the server
app.listen(PORT, () => {
  console.log(`\n  Runs at http://localhost:${PORT}`);
  console.log(
    `  Open http://localhost:${PORT} in your browser to load the GUI.`,
  );
  console.log(`\n  API Endpoints:`);
  console.log(`    POST /api/client/:clientId/request`);
  console.log(`    POST /api/coordinator/crash`);
  console.log(`    POST /api/reset\n`);
});
