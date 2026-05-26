/**
 * API Module — Comunicación con Backend Flask
 * Actúa como proxy hacia la API REST v2 de FortiGate
 */

const API = (() => {
    // ---- CONFIGURACIÓN ----
    const CONFIG = {
        baseUrl: 'http://54.204.211.76:5000',  // IP de la instancia AWS EC2
        timeout: 15000
    };

    let authToken = null;

    // ---- HTTP Client ---- 
    async function request(method, endpoint, body = null) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const options = {
            method,
            headers,
            signal: AbortSignal.timeout(CONFIG.timeout)
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${CONFIG.baseUrl}${endpoint}`, options);

            if (response.status === 401) {
                authToken = null;
                sessionStorage.removeItem('auth_token');
                window.dispatchEvent(new CustomEvent('auth:expired'));
                throw new Error('Sesión expirada');
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || `Error HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error.name === 'TimeoutError') {
                throw new Error('Tiempo de conexión agotado');
            }
            throw error;
        }
    }

    // ---- Check Backend Connectivity ----
    async function checkConnection() {
        try {
            const response = await fetch(`${CONFIG.baseUrl}/api/health`, {
                signal: AbortSignal.timeout(5000)
            });
            if (response.ok) {
                return { connected: true, mode: 'live' };
            }
        } catch (e) {
            // Backend not available
        }
        return { connected: false, mode: 'offline' };
    }

    // ---- Public API ----
    return {
        get config() { return CONFIG; },
        get isDemoMode() { return false; }, // Desactivado por completo

        setToken(token) {
            authToken = token;
            sessionStorage.setItem('auth_token', token);
        },

        clearToken() {
            authToken = null;
            sessionStorage.removeItem('auth_token');
        },

        loadToken() {
            authToken = sessionStorage.getItem('auth_token');
            return !!authToken;
        },

        checkConnection,

        // Auth
        login: (username, password) => request('POST', '/api/auth/login', { username, password }),
        logout: () => request('POST', '/api/auth/logout'),

        // Interfaces (FortiGate CMDB + Monitor)
        getInterfaces: () => request('GET', '/api/interfaces'),
        toggleInterface: (name, status) => request('PUT', `/api/interfaces/${name}/toggle`, { status }),

        // Dashboard (FortiGate Monitor)
        getStats: () => request('GET', '/api/dashboard/stats'),
        getTraffic: () => request('GET', '/api/dashboard/traffic'),

        // Logs (Syslog almacenados en BD)
        getLogs: (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return request('GET', `/api/logs${query ? '?' + query : ''}`);
        },

        // Actions History
        getActionsHistory: () => request('GET', '/api/actions/history')
    };
})();
