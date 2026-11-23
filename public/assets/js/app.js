/**
 * Centralized Mutual Exclusion UI Controller
 * Logic is unchanged. All class names updated to match the new
 * black / green / white flat CSS (custom.css). No Tailwind classes used.
 */
let startTime = Date.now();
let isSimRunning = false;

// ── Modal controller ─────────────────────────────────────────────────────────
/**
 * Shows the shared modal dialog.
 * @param {object} opts
 * @param {'info'|'success'|'alert'|'error'} opts.type  - Controls confirm-button color.
 * @param {string}   opts.title
 * @param {string}   opts.messageHtml
 * @param {string}   [opts.confirmText='OK']
 * @param {Function} [opts.onConfirm=null]
 */
function showModal({
  type = "info",
  title,
  messageHtml,
  confirmText = "OK",
  onConfirm = null,
}) {
  const modal = document.getElementById("customModal");
  const titleEl = document.getElementById("modalTitle");
  const bodyEl = document.getElementById("modalBody");
  const confirmBtn = document.getElementById("modalConfirmBtn");
  const cancelBtn = document.getElementById("modalCancelBtn");

  titleEl.textContent = title;
  bodyEl.innerHTML = messageHtml;
  confirmBtn.textContent = confirmText;

  // Swap confirm-button color class based on type
  confirmBtn.className = "btn";
  if (type === "error" || type === "alert") {
    confirmBtn.classList.add("btn-red");
  } else if (type === "success") {
    confirmBtn.classList.add("btn-green");
  } else {
    confirmBtn.classList.add("btn-green"); // info default
  }

  cancelBtn.style.display = "none";
  modal.classList.add("flex");

  const cleanup = () => {
    modal.classList.remove("flex");
    confirmBtn.removeEventListener("click", handleConfirm);
    document
      .getElementById("modalCloseX")
      .removeEventListener("click", cleanup);
  };

  const handleConfirm = async () => {
    cleanup();
    if (onConfirm) await onConfirm();
  };

  confirmBtn.addEventListener("click", handleConfirm, { once: true });
  document
    .getElementById("modalCloseX")
    .addEventListener("click", cleanup, { once: true });
}

// ── Packet inspector modal ────────────────────────────────────────────────────
/**
 * Opens a modal showing the raw network message packet details.
 * Called when a user clicks any log entry.
 */
function showPacketModal(type, sender, receiver, details) {
  const html = `
    <div style="background:#000;border:1px solid #22c55e;padding:12px;font-family:'Courier New',monospace;font-size:0.72rem;line-height:1.8;">
      <div><span style="color:#555;">MESSAGE TYPE:</span> ${type}</div>
      <div><span style="color:#555;">SENDER:</span>       ${sender}</div>
      <div><span style="color:#555;">RECEIVER:</span>     ${receiver}</div>
      <div><span style="color:#555;">TIMESTAMP:</span>    ${Date.now() - startTime} ms</div>
      <div><span style="color:#555;">PAYLOAD:</span>      { lockStatus: "ACTIVE", granted: ${type === "GRANT"} }</div>
    </div>
    <p style="font-size:0.72rem;color:#aaa;margin-top:10px;">${details}</p>
  `;
  showModal({
    type: "info",
    title: "Network Message Packet Inspector",
    messageHtml: html,
    confirmText: "Close",
  });
}

// ── Logging ───────────────────────────────────────────────────────────────────
/**
 * Appends a timestamped entry to the terminal.
 * Clicking the entry opens the packet inspector modal.
 */
function logMessage(
  text,
  packetType = "INFO",
  sender = "System",
  receiver = "Coordinator",
) {
  const terminal = document.getElementById("logTerminal");
  const elapsed = Date.now() - startTime;
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.textContent = `[${elapsed} ms] ${text}`;
  entry.onclick = () => showPacketModal(packetType, sender, receiver, text);
  terminal.appendChild(entry);
  terminal.scrollTop = terminal.scrollHeight;
}

// ── Render state ──────────────────────────────────────────────────────────────
/**
 * Updates every visual element to reflect the state object returned by the backend:
 *   { currentHolder: string|null, waitingQueue: string[], clients: { [id]: string } }
 */
function renderState(state) {
  const holder = state.currentHolder || "None";
  const waitingQueue = state.waitingQueue || [];

  // Active holder & queue length metrics
  document.getElementById("activeHolderVal").textContent = holder;
  document.getElementById("queueLengthVal").textContent =
    `${waitingQueue.length} Clients`;

  // Lock box
  const lockTag = document.getElementById("lockIconContainer");
  const csTitle = document.getElementById("csStatusTitle");
  const csDesc = document.getElementById("csStatusDesc");

  if (holder !== "None") {
    lockTag.textContent = "LOCKED";
    lockTag.className = "lock-tag locked";
    csTitle.textContent = `${holder} In Critical Section`;
    csDesc.textContent = "Exclusive access granted by coordinator.";
  } else {
    lockTag.textContent = "UNLOCKED";
    lockTag.className = "lock-tag unlocked";
    csTitle.textContent = "Resource Unlocked";
    csDesc.textContent = "Waiting for client request or mutex acquisition.";
  }

  // Client status badges
  ["Client-1", "Client-2", "Client-3"].forEach((clientId, i) => {
    const badge = document.getElementById(`client${i + 1}Badge`);
    const status = state.clients[clientId] || "IDLE";

    if (status === "IN_CRITICAL_SECTION") {
      badge.textContent = "IN CRITICAL SECTION";
      badge.className = "status-badge active";
    } else if (status === "WAITING" || waitingQueue.includes(clientId)) {
      badge.textContent = "QUEUED (WAITING)";
      badge.className = "status-badge waiting";
    } else {
      badge.textContent = "Ready / Waiting";
      badge.className = "status-badge idle";
    }
  });
}

// ── Event listeners ───────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const toggleSimBtn = document.getElementById("toggleSimBtn");
  const simStateBadge = document.getElementById("simStateBadge");

  // Start / Pause toggle
  toggleSimBtn.addEventListener("click", () => {
    isSimRunning = !isSimRunning;
    if (isSimRunning) {
      toggleSimBtn.textContent = "Pause Sim";
      toggleSimBtn.className = "btn btn-white";
      simStateBadge.textContent = "RUNNING";
      simStateBadge.className = "sim-badge running";
      logMessage(
        "[System]: Simulation engine started.",
        "SYS",
        "System",
        "Coordinator",
      );
    } else {
      toggleSimBtn.textContent = "Start Sim";
      toggleSimBtn.className = "btn btn-green";
      simStateBadge.textContent = "PAUSED";
      simStateBadge.className = "sim-badge paused";
      logMessage(
        "[System]: Simulation engine paused.",
        "SYS",
        "System",
        "Coordinator",
      );
    }
  });

  // Client "Request Access" buttons
  document.querySelectorAll(".clientReqBtn").forEach((button) => {
    button.addEventListener("click", async (e) => {
      const clientId = e.target.getAttribute("data-client");
      logMessage(
        `${clientId} sends REQUEST to Coordinator`,
        "REQUEST",
        clientId,
        "Coordinator",
      );

      try {
        const response = await MutexAPI.requestClient(clientId);
        if (response.success) {
          logMessage(
            `COORDINATOR received REQUEST from ${clientId}`,
            "RECV",
            "Coordinator",
            clientId,
          );
          logMessage(
            `COORDINATOR sends GRANT to ${clientId}`,
            "GRANT",
            "Coordinator",
            clientId,
          );
          logMessage(
            `${clientId} >>> ENTERS critical section`,
            "EXEC",
            clientId,
            "Critical Section",
          );
          renderState(response.data);
        }
      } catch (error) {
        showModal({
          type: "error",
          title: "Backend Connection Error",
          messageHtml: `<p>Could not reach backend: <strong>${error.message}</strong>. Ensure the server is running on port 5000.</p>`,
          confirmText: "Dismiss",
        });
        logMessage(`[Error]: ${error.message}`, "ERR", clientId, "Server");
      }
    });
  });

  // Crash coordinator button
  document
    .getElementById("crashCoordinatorBtn")
    .addEventListener("click", async () => {
      try {
        const response = await MutexAPI.crashCoordinator();
        if (response.success) {
          showModal({
            type: "alert",
            title: "Coordinator Failure",
            messageHtml:
              "<p>The central coordinator process has been terminated. All client requests are now stalled.</p>",
            confirmText: "Acknowledge",
          });
          logMessage(
            "COORDINATOR failed! Single point of failure encountered.",
            "CRASH",
            "Coordinator",
            "All Clients",
          );
          simStateBadge.textContent = "CRASHED";
          simStateBadge.className = "sim-badge crashed";
        }
      } catch (error) {
        showModal({
          type: "error",
          title: "Error",
          messageHtml: `<p>${error.message}</p>`,
          confirmText: "OK",
        });
      }
    });

  // Reset button
  document.getElementById("resetSimBtn").addEventListener("click", async () => {
    try {
      const response = await MutexAPI.resetSystem();
      startTime = Date.now();
      document.getElementById("logTerminal").innerHTML =
        "<div>[System]: Simulation reset. Ready.</div>";
      simStateBadge.textContent = "PAUSED";
      simStateBadge.className = "sim-badge paused";
      isSimRunning = false;
      toggleSimBtn.textContent = "Start Sim";
      toggleSimBtn.className = "btn btn-green";
      renderState(response.data);
      showModal({
        type: "success",
        title: "System Reset",
        messageHtml:
          "<p>All coordinator states and client nodes have been reset to IDLE.</p>",
        confirmText: "OK",
      });
    } catch (error) {
      showModal({
        type: "error",
        title: "Reset Failed",
        messageHtml: `<p>${error.message}</p>`,
        confirmText: "OK",
      });
    }
  });

  // Clear log
  document.getElementById("clearLogBtn").addEventListener("click", () => {
    document.getElementById("logTerminal").innerHTML =
      "<div>[System]: Log cleared.</div>";
  });
});
