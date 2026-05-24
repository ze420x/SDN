/**
 * API Module — Comunicación con Backend Flask
 * Actúa como proxy hacia la API REST v2 de FortiGate
 * Incluye modo demo con datos simulados
 */

const API = (() => {
    // ---- CONFIGURACIÓN ----
    const CONFIG = {
        baseUrl: 'http://54.204.211.76:5000',  // IP de la instancia AWS EC2
        timeout: 15000,
        demoMode: true  // Se activa automáticamente si el backend no responde
    };

    let authToken = null;

    // ---- DATOS DEMO (simulación realista) ----
    const DEMO_DATA = {
        user: { username: 'admin', role: 'Administrador', name: 'Operador SDN' },

        interfaces: [
            { name: 'Wan1', alias: 'Puerto de red', status: 'up', type: 'physical' },
            { name: 'Wan2', alias: 'Puerto de red', status: 'down', type: 'physical' },
            { name: 'Eth1', alias: 'Puerto de red', status: 'up', type: 'physical' },
            { name: 'Eth2', alias: 'Puerto de red', status: 'down', type: 'physical' },
            { name: 'Eth3', alias: 'Puerto de red', status: 'up', type: 'physical' },
            { name: 'Eth4', alias: 'Puerto de red', status: 'up', type: 'physical' }
        ],

        stats: {
            cpu: 23,
            memory: 58,
            sessions: 1847,
            uptime: 864000,  // 10 días en segundos
            firmware: 'PinGuard OS v1.0',
            hostname: 'PG-AWS-01',
            serial: 'PGVM020000XXXXXX'
        },

        traffic: (() => {
            const data = [];
            const now = Date.now();
            for (let i = 23; i >= 0; i--) {
                data.push({
                    timestamp: now - (i * 3600000),
                    rx: Math.floor(Math.random() * 500 + 200),
                    tx: Math.floor(Math.random() * 350 + 150)
                });
            }
            return data;
        })(),

        logs: (() => {
            const severities = ['emergency', 'critical', 'warning', 'notice', 'information'];
            const events = [
                { msg: 'Login fallido desde IP externa', src: '45.33.32.156', severity: 'warning' },
                { msg: 'Interfaz wan2 cambió estado a DOWN', src: '203.0.113.10', severity: 'critical' },
                { msg: 'Sesión VPN establecida correctamente', src: '10.200.1.2', severity: 'notice' },
                { msg: 'Política de firewall #15 denegó tráfico', src: '192.168.1.105', severity: 'warning' },
                { msg: 'Actualización de firmas IPS completada', src: '192.168.1.1', severity: 'information' },
                { msg: 'Ataque DDoS detectado en wan1', src: '185.220.101.34', severity: 'emergency' },
                { msg: 'Certificado SSL próximo a expirar', src: '10.10.10.5', severity: 'warning' },
                { msg: 'CPU utilización supera umbral 80%', src: '192.168.1.1', severity: 'critical' },
                { msg: 'Nuevo dispositivo conectado a port1', src: '192.168.1.200', severity: 'notice' },
                { msg: 'Tráfico DNS anómalo detectado', src: '192.168.1.45', severity: 'warning' },
                { msg: 'Túnel VPN-SITE-B desconectado', src: '10.200.2.1', severity: 'critical' },
                { msg: 'Backup de configuración realizado', src: '192.168.1.1', severity: 'information' },
                { msg: 'Regla NAT aplicada correctamente', src: '203.0.113.10', severity: 'information' },
                { msg: 'Intento de acceso a sitio bloqueado', src: '192.168.1.88', severity: 'notice' },
                { msg: 'Autenticación RADIUS exitosa', src: '192.168.1.33', severity: 'information' },
                { msg: 'Interfaz port3 alta utilización', src: '172.16.0.1', severity: 'warning' },
                { msg: 'Sesión admin cerrada por timeout', src: '192.168.1.100', severity: 'notice' },
                { msg: 'Escaneo de puertos detectado', src: '103.235.46.39', severity: 'critical' },
                { msg: 'Failover activado a wan2', src: '198.51.100.2', severity: 'emergency' },
                { msg: 'Política de contenido web actualizada', src: '192.168.1.1', severity: 'information' }
            ];

            const logs = [];
            const now = Date.now();
            for (let i = 0; i < 50; i++) {
                const event = events[i % events.length];
                logs.push({
                    id: 1000 + i,
                    date: new Date(now - (i * 420000)).toISOString(),
                    src_ip: event.src,
                    event: event.msg,
                    severity: event.severity,
                    type: i % 3 === 0 ? 'traffic' : (i % 3 === 1 ? 'event' : 'security')
                });
            }
            return logs;
        })(),

        actionsHistory: [
            { action: 'Interfaz wan1 encendida', user: 'admin', time: '2026-04-05 14:30:00', status: 'success' },
            { action: 'Interfaz wan2 apagada', user: 'admin', time: '2026-04-05 13:15:00', status: 'success' },
            { action: 'VPN Sede Central habilitada', user: 'admin', time: '2026-04-05 10:45:00', status: 'success' },
            { action: 'Interfaz port3 reiniciada', user: 'admin', time: '2026-04-04 16:20:00', status: 'warning' },
            { action: 'VPN Sede Remota deshabilitada', user: 'admin', time: '2026-04-04 09:00:00', status: 'success' }
        ]
    };

    // ---- HTTP Client ---- 
    async function request(method, endpoint, body = null) {
        if (CONFIG.demoMode) {
            return handleDemoRequest(method, endpoint, body);
        }

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

    // ---- Demo Request Handler ----
    async function handleDemoRequest(method, endpoint, body) {
        // Simulate network delay
        await new Promise(r => setTimeout(r, 300 + Math.random() * 500));

        // --- AUTH ---
        if (endpoint === '/api/auth/login' && method === 'POST') {
            if (body.username === 'Forti' && body.password === 'duoc') {
                return {
                    success: true,
                    token: 'demo_token_' + Date.now(),
                    user: DEMO_DATA.user
                };
            }
            throw new Error('Credenciales incorrectas');
        }

        if (endpoint === '/api/auth/logout') {
            return { success: true };
        }

        // --- INTERFACES ---
        if (endpoint === '/api/interfaces' && method === 'GET') {
            return { success: true, data: DEMO_DATA.interfaces };
        }

        if (endpoint.match(/\/api\/interfaces\/(.+)\/toggle/) && method === 'PUT') {
            const name = endpoint.match(/\/api\/interfaces\/(.+)\/toggle/)[1];
            const iface = DEMO_DATA.interfaces.find(i => i.name === name);
            if (iface) {
                iface.status = body.status;
                DEMO_DATA.actionsHistory.unshift({
                    action: `Interfaz ${name} ${body.status === 'up' ? 'encendida' : 'apagada'}`,
                    user: 'admin',
                    time: new Date().toLocaleString('es-CL'),
                    status: 'success'
                });
                return { success: true, data: iface };
            }
            throw new Error('Interfaz no encontrada');
        }

        // --- DASHBOARD ---
        if (endpoint === '/api/dashboard/stats') {
            // Simulate slight CPU/memory variations
            DEMO_DATA.stats.cpu = Math.min(95, Math.max(5, DEMO_DATA.stats.cpu + (Math.random() * 10 - 5)));
            DEMO_DATA.stats.memory = Math.min(90, Math.max(30, DEMO_DATA.stats.memory + (Math.random() * 6 - 3)));
            DEMO_DATA.stats.sessions = Math.floor(DEMO_DATA.stats.sessions + (Math.random() * 200 - 100));
            return {
                success: true,
                data: {
                    ...DEMO_DATA.stats,
                    cpu: Math.round(DEMO_DATA.stats.cpu),
                    memory: Math.round(DEMO_DATA.stats.memory),
                    interfaces_up: DEMO_DATA.interfaces.filter(i => i.status === 'up').length,
                    interfaces_total: DEMO_DATA.interfaces.length
                }
            };
        }

        if (endpoint === '/api/dashboard/traffic') {
            // Push new data point
            DEMO_DATA.traffic.push({
                timestamp: Date.now(),
                rx: Math.floor(Math.random() * 500 + 200),
                tx: Math.floor(Math.random() * 350 + 150)
            });
            if (DEMO_DATA.traffic.length > 24) DEMO_DATA.traffic.shift();
            return { success: true, data: DEMO_DATA.traffic };
        }

        // --- LOGS ---
        if (endpoint.startsWith('/api/logs')) {
            const url = new URL(endpoint, 'http://localhost');
            const severity = url.searchParams.get('severity');
            const search = url.searchParams.get('search');
            const page = parseInt(url.searchParams.get('page') || '1');
            const perPage = parseInt(url.searchParams.get('per_page') || '10');

            let filtered = [...DEMO_DATA.logs];

            if (severity && severity !== 'all') {
                filtered = filtered.filter(l => l.severity === severity);
            }
            if (search) {
                const q = search.toLowerCase();
                filtered = filtered.filter(l =>
                    l.event.toLowerCase().includes(q) ||
                    l.src_ip.includes(q)
                );
            }

            const total = filtered.length;
            const start = (page - 1) * perPage;
            const paged = filtered.slice(start, start + perPage);

            return {
                success: true,
                data: paged,
                pagination: {
                    page,
                    per_page: perPage,
                    total,
                    total_pages: Math.ceil(total / perPage)
                }
            };
        }

        // --- ACTIONS HISTORY ---
        if (endpoint === '/api/actions/history') {
            return { success: true, data: DEMO_DATA.actionsHistory };
        }

        throw new Error('Endpoint no encontrado');
    }

    // ---- Check Backend Connectivity ----
    async function checkConnection() {
        try {
            const response = await fetch(`${CONFIG.baseUrl}/api/health`, {
                signal: AbortSignal.timeout(5000)
            });
            if (response.ok) {
                CONFIG.demoMode = false;
                return { connected: true, mode: 'live' };
            }
        } catch (e) {
            // Backend not available
        }
        CONFIG.demoMode = true;
        return { connected: false, mode: 'demo' };
    }

    // ---- Public API ----
    return {
        get config() { return CONFIG; },
        get isDemoMode() { return CONFIG.demoMode; },

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
