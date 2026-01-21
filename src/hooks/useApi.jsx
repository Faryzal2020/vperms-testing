import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';

export function useApi() {
    const { token, logout } = useAuth();

    const fetchApi = async (endpoint, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers,
        };

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers,
            });

            // Handle 401 - auto logout
            if (response.status === 401) {
                logout();
                throw new Error('Session expired. Please login again.');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Request failed with status ${response.status}`);
            }

            return data;
        } catch (error) {
            // Network error or CORS issue
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Unable to connect to server. Check if the backend is running.');
            }
            throw error;
        }
    };

    return {
        get: (endpoint) => fetchApi(endpoint),
        post: (endpoint, body) => fetchApi(endpoint, { method: 'POST', body: JSON.stringify(body) }),
        put: (endpoint, body) => fetchApi(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
        patch: (endpoint, body) => fetchApi(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
        delete: (endpoint) => fetchApi(endpoint, { method: 'DELETE' }),
    };
}
