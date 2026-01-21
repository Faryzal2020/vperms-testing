/**
 * API Configuration
 * Change the BACKEND_URL to point to your Fleet Tracker backend server
 */

// Backend server URL - change this to your server's IP/domain
// Examples:
//   - Local: 'http://localhost:3000'
//   - Remote: 'http://192.168.1.100:3000' or 'https://api.yourserver.com'
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// API version prefix
export const API_PREFIX = '/api/v1';

// Full API base URL
export const API_BASE = `${BACKEND_URL}${API_PREFIX}`;

// Export config object
const config = {
    backendUrl: BACKEND_URL,
    apiPrefix: API_PREFIX,
    apiBase: API_BASE,
};

export default config;
