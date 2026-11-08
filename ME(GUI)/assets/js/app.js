/**
 * Centralized Mutual Exclusion UI Controller with Queue Inspector & Execution Timers
 */
let startTime = Date.now();
let isSimRunning = false;

// --- MULTI-TYPE POP-UP MODAL CONTROLLER ---
function showModal({
  type = 'info',
  title,
  messageHtml,
  confirmText = 'OK',
  onConfirm = null,
}) {
  const modal = document.getElementById('customModal');
  const titleEl = document.getElementById('modalTitle');
  const bodyEl = document.getElementById('modalBody');
  const confirmBtn = document.getElementById('modalConfirmBtn');
  const cancelBtn = document.getElementById('modalCancelBtn');

  titleEl.textContent = title;
  bodyEl.innerHTML = messageHtml;
  confirmBtn.textContent = confirmText;

  confirmBtn.className =
    'px-4 py-2 text-white text-xs font-semibold rounded-lg transition shadow-md ';
  if (type === 'success') {
    confirmBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-500');
  } else if (type === 'alert' || type === 'error') {
    confirmBtn.classList.add('bg-rose-600', 'hover:bg-rose-500');
  } else {
    confirmBtn.classList.add('bg-teal-600', 'hover:bg-teal-500');
  }

  cancelBtn.classList.add('hidden');

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  const handleConfirm = async () => {
    cleanup();
    if (onConfirm) await onConfirm();
  };

  const cleanup = () => {
    modal.classList.remove('flex');
    modal.classList.add('hidden');
    confirmBtn.removeEventListener('click', handleConfirm);
    document
      .getElementById('modalCloseX')
      .removeEventListener('click', cleanup);
  };

  confirmBtn.addEventListener('click', handleConfirm, { once: true });
  document
    .getElementById('modalCloseX')
    .addEventListener('click', cleanup, { once: true });
}

// --- MESSAGE PACKET INSPECTOR POP-UP ---
function showPacketModal(type, sender, receiver, details) {
  const htmlContent = `
        <div class="bg-slate-950 text-teal-400 font-mono p-3 rounded-lg text-xs space-y-1 border border-slate-800">
            <div><span class="text-slate-500">MESSAGE TYPE:</span> ${type}</div>
            <div><span class="text-slate-500">SENDER:</span> ${sender}</div>
            <div><span class="text-slate-500">RECEIVER:</span> ${receiver}</div>
            <div><span class="text-slate-500">TIMESTAMP:</span> ${Date.now() - startTime} ms</div>
            <div><span class="text-slate-500">PAYLOAD:</span> { lockStatus: "ACTIVE", granted: ${type === 'GRANT'} }</div>
        </div>
        <p class="text-xs text-slate-300 mt-2">${details}</p>
    `;
  showModal({
    type: 'info',
    title: 'Network Message Packet Inspector',
    messageHtml: htmlContent,
    confirmText: 'Close',
  });
}

// --- LOGGING ---
function logMessage(
  text,
  packetType = 'INFO',
  sender = 'System',
  receiver = 'Coordinator',
) {
  const terminal = document.getElementById('logTerminal');
  const elapsed = Date.now() - startTime;
  const entry = document.createElement('div');
  entry.className =
    'cursor-pointer hover:bg-slate-900 p-1 rounded transition font-mono';
  entry.textContent = `[${elapsed} ms] ${text}`;

  entry.onclick = () => showPacketModal(packetType, sender, receiver, text);

  terminal.appendChild(entry);
  terminal.scrollTop = terminal.scrollHeight;
}

// --- RENDER STATE WITH EXECUTION TIMER & QUEUE SUPPORT ---
function renderState(state) {
  const holder = state.currentHolder || 'None';
  document.getElementById('activeHolderVal').textContent = holder;

  // Update queue length metric if provided by backend
  const waitingQueue = state.waitingQueue || [];
  document.getElementById('queueLengthVal').textContent =
    `${waitingQueue.length} Clients`;

  const lockContainer = document.getElementById('lockIconContainer');
  const csTitle = document.getElementById('csStatusTitle');
  const csDesc = document.getElementById('csStatusDesc');

  if (holder !== 'None') {
    lockContainer.textContent = 'LOCKED';
    lockContainer.className =
      'px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold tracking-wider shadow-inner border border-emerald-500/30 animate-pulse';
    csTitle.textContent = `${holder} In Critical Section`;
    csDesc.textContent = 'Exclusive access granted by coordinator.';
  } else {
    lockContainer.textContent = 'UNLOCKED';
    lockContainer.className =
      'px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs font-bold tracking-wider shadow-inner transition-all duration-300';
    csTitle.textContent = 'Resource Unlocked';
    csDesc.textContent = 'Waiting for client request or mutex acquisition.';
  }

  ['Client-1', 'Client-2', 'Client-3'].forEach((clientId, index) => {
    const badge = document.getElementById(`client${index + 1}Badge`);
    const status = state.clients[clientId] || 'IDLE';

    if (status === 'IN_CRITICAL_SECTION') {
      badge.textContent = 'IN CRITICAL SECTION';
      badge.className =
        'px-3 py-1.5 rounded-lg text-center font-bold text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse';
    } else if (status.includes('WAITING') || waitingQueue.includes(clientId)) {
      badge.textContent = 'QUEUED (WAITING)';
      badge.className =
        'px-3 py-1.5 rounded-lg text-center font-bold text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30';
    } else {
      badge.textContent = 'Ready / Waiting';
      badge.className =
        'px-3 py-1.5 rounded-lg text-center font-bold text-xs bg-slate-800 text-slate-400 border border-slate-700 transition-all';
    }
  });
}

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
  const toggleSimBtn = document.getElementById('toggleSimBtn');
  const simStateBadge = document.getElementById('simStateBadge');

  toggleSimBtn.addEventListener('click', () => {
    isSimRunning = !isSimRunning;
    if (isSimRunning) {
      toggleSimBtn.textContent = 'Pause Sim';
      toggleSimBtn.className =
        'flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition shadow-md';
      simStateBadge.textContent = 'RUNNING';
      simStateBadge.className =
        'px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      logMessage(
        '[System]: Simulation engine started.',
        'SYS',
        'System',
        'Coordinator',
      );
    } else {
      toggleSimBtn.textContent = 'Start Sim';
      toggleSimBtn.className =
        'flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-md';
      simStateBadge.textContent = 'PAUSED';
      simStateBadge.className =
        'px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20';
      logMessage(
        '[System]: Simulation engine paused.',
        'SYS',
        'System',
        'Coordinator',
      );
    }
  });

  document.querySelectorAll('.clientReqBtn').forEach((button) => {
    button.addEventListener('click', async (e) => {
      const clientId = e.target.getAttribute('data-client');
      logMessage(
        `${clientId} sends REQUEST to Coordinator`,
        'REQUEST',
        clientId,
        'Coordinator',
      );

      try {
        const response = await MutexAPI.requestClient(clientId);
        if (response.success) {
          logMessage(
            `COORDINATOR received REQUEST from ${clientId}`,
            'RECV',
            'Coordinator',
            clientId,
          );
          logMessage(
            `COORDINATOR sends GRANT to ${clientId}`,
            'GRANT',
            'Coordinator',
            clientId,
          );
          logMessage(
            `${clientId} >>> ENTERS critical section`,
            'EXEC',
            clientId,
            'Critical Section',
          );
          renderState(response.data);
        }
      } catch (error) {
        showModal({
          type: 'error',
          title: 'Backend Connection Error',
          messageHtml: `<p class='text-xs'>Could not reach backend server endpoints: <strong>${error.message}</strong>. Ensure your backend server is running.</p>`,
          confirmText: 'Dismiss',
        });
        logMessage(`[Error]: ${error.message}`, 'ERR', clientId, 'Server');
      }
    });
  });

  document
    .getElementById('crashCoordinatorBtn')
    .addEventListener('click', async () => {
      try {
        const response = await MutexAPI.crashCoordinator();
        if (response.success) {
          showModal({
            type: 'alert',
            title: 'Coordinator Failure Alert',
            messageHtml:
              "<p class='text-xs'>The central coordinator process has been terminated. All client requests are now stalled.</p>",
            confirmText: 'Acknowledge',
          });
          logMessage(
            'COORDINATOR failed! Single point of failure encountered.',
            'CRASH',
            'Coordinator',
            'All Clients',
          );
          document.getElementById('simStateBadge').textContent = 'CRASHED';
          document.getElementById('simStateBadge').className =
            'px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20';
        }
      } catch (error) {
        showModal({
          type: 'error',
          title: 'Error',
          messageHtml: `<p class='text-xs'>${error.message}</p>`,
          confirmText: 'OK',
        });
      }
    });

  document.getElementById('resetSimBtn').addEventListener('click', async () => {
    try {
      const response = await MutexAPI.resetSystem();
      startTime = Date.now();
      document.getElementById('logTerminal').innerHTML =
        `<div class="font-mono">[System]: Simulation reset. Ready.</div>`;
      document.getElementById('simStateBadge').textContent = 'PAUSED';
      document.getElementById('simStateBadge').className =
        'px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20';
      isSimRunning = false;
      toggleSimBtn.textContent = 'Start Sim';
      toggleSimBtn.className =
        'flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-md';
      renderState(response.data);

      showModal({
        type: 'success',
        title: 'System Reset Successful',
        messageHtml:
          "<p class='text-xs'>All coordinator states and client nodes have been reset to IDLE.</p>",
        confirmText: 'OK',
      });
    } catch (error) {
      showModal({
        type: 'error',
        title: 'Reset Failed',
        messageHtml: `<p class='text-xs'>${error.message}</p>`,
        confirmText: 'OK',
      });
    }
  });

  document.getElementById('algorithmGuideBtn').addEventListener('click', () => {
    showModal({
      type: 'info',
      title: 'Algorithm Guide & Direction',
      messageHtml: `
                <ul class="list-disc pl-5 space-y-2 text-xs text-slate-300">
                    <li><strong>Coordinator Node:</strong> Manages access requests and maintains a strict FIFO queue.</li>
                    <li><strong>Request Phase:</strong> Clients send permission requests to the central coordinator.</li>
                    <li><strong>Grant Phase:</strong> Only one client is granted entry into the critical section at a time.</li>
                    <li><strong>Interactive Logs:</strong> Click any entry in the live console to inspect network packet payloads.</li>
                </ul>
            `,
      confirmText: 'Got It',
    });
  });

  document.getElementById('settingsBtn').addEventListener('click', () => {
    showModal({
      type: 'info',
      title: 'Simulation Settings',
      messageHtml: `
                <div class="space-y-3 text-xs">
                    <div>
                        <label class="block text-slate-400 mb-1">Active Architecture</label>
                        <input type="text" value="Centralized Server (1 Coordinator, 3 Clients)" disabled class="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-300">
                    </div>
                    <div>
                        <label class="block text-slate-400 mb-1">Backend Base URL</label>
                        <input type="text" value="http://localhost:5000/api" disabled class="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-300">
                    </div>
                </div>
            `,
      confirmText: 'Close',
    });
  });

  document.getElementById('clearLogBtn').addEventListener('click', () => {
    document.getElementById('logTerminal').innerHTML =
      `<div class="font-mono">[System]: Log cleared.</div>`;
  });
});
