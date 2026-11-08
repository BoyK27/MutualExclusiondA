/**
 * API Endpoint Manager for Centralized Mutual Exclusion Backend
 * All mock data removed. Communicates directly with backend server.
 */
const API_CONFIG = {
  baseUrl: 'http://localhost:5000/api',
};

const MutexAPI = {
  async requestClient(clientId) {
    try {
      const res = await fetch(
        `${API_CONFIG.baseUrl}/client/${clientId}/request`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
      );
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      return await res.json();
    } catch (error) {
      throw new Error(`Failed to connect to backend: ${error.message}`);
    }
  },

  async crashCoordinator() {
    try {
      const res = await fetch(`${API_CONFIG.baseUrl}/coordinator/crash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      return await res.json();
    } catch (error) {
      throw new Error(`Failed to crash coordinator: ${error.message}`);
    }
  },

  async resetSystem() {
    try {
      const res = await fetch(`${API_CONFIG.baseUrl}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      return await res.json();
    } catch (error) {
      throw new Error(`Failed to reset system: ${error.message}`);
    }
  },
};
