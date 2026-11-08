OmniSync - Centralized Mutual Exclusion GUI

A professional, high-end dark-mode web application built with HTML5, Tailwind CSS, and Vanilla JavaScript (ES6+) following a modular file structure. This interface serves as the frontend client for a Distributed Mutual Exclusion Algorithm (Centralized Coordinator model), designed for academic demonstrations and live project presentations.
📁 Project Folder Structure

mutex-visualizer/
├── index.html              # Main GUI layout (Coordinator panel, 3 client cards, terminal)
├── README.md               # Summary documentation and setup guide
└── assets/
    ├── css/
    │   └── custom.css      # Custom scrollbars, animations, and modal display rules
    └── js/
        ├── api.js          # REST API integration layer (connects to backend endpoints)
        └── app.js          # UI state controller, event handlers, and pop-up modal logic

🚀 Key Features & Components

    Coordinator Panel (Top Bar):
        Displays real-time system status (RUNNING or CRASHED).
        Tracks the active critical section holder and the active waiting queue length.
        Master controls: Crash Coordinator (tests single point of failure) and Reset (restores default state).

    Competing Clients Grid (3 Nodes):
        Dedicated cards for Client-1, Client-2, and Client-3 (representing distributed polling stations or worker nodes).
        Real-time status badges (Ready / Waiting, In Critical Section, Queued).
        Individual Request Access buttons to trigger permission requests.

    Live State Transition Console:
        Timestamped terminal logging every network event.
        Interactive Packet Inspector: Clicking any log entry opens a pop-up modal displaying the raw network message payload (REQUEST, GRANT, timestamps, and tokens).

    Multi-Variant Pop-up Modal System:
        Success Modals: Confirms engine start or system resets.
        Error Modals: Instantly warns users if backend connection fails.
        Alert Modals: Warns users before simulating coordinator crashes.
        Info / Direction Modals: Provides algorithm guidelines and architectural overviews.

🔌 Backend Integration Guide

    No Mock Data: All mock simulation timers have been removed. The frontend communicates via live HTTP fetch() requests pointing to your backend server.
    Base URL Config: Configured in assets/js/api.js:

    const API_CONFIG = {
        baseUrl: "http://localhost:5000/api"
    };

    Required Endpoints:
        POST /api/client/{clientId}/request — Requests critical section access.
        POST /api/coordinator/crash — Simulates coordinator failure.
        POST /api/reset — Resets all nodes to idle.

🛠️ How to Run Locally

    Ensure your backend server is running locally on port 5000.
    Open index.html directly in any modern browser, or serve the folder using a local development tool like VS Code Live Server.
# MutualExclusiondA
