/**
 * Dashboard Module — Monitoreo en tiempo real
 * Consume datos de FortiGate Monitor API a través del backend
 */

const Dashboard = (() => {
    let trafficChart = null;
    let refreshInterval = null;
    const REFRESH_RATE = 3000; // 3 segundos (Tiempo real)

    // ---- Render Dashboard ----
    function render(container) {
        container.innerHTML = `
            <div class="view-container">
                <div class="page-header">
                    <div>
                        <div class="breadcrumb">
                            <a onclick="App.navigate('menu')">Menú</a>
                            <span>›</span>
                            <span>Dashboard</span>
                        </div>
                        <h2>📊 Dashboard de Monitoreo</h2>
                    </div>
                    <div class="flex items-center gap-sm">
                        <span class="text-muted" style="font-size: var(--font-size-xs);" id="dashboard-last-update"></span>
                        <button class="btn-icon" onclick="Dashboard.refresh()" title="Actualizar" id="btn-refresh-dashboard">🔄</button>
                        <button class="btn btn-secondary btn-sm" onclick="App.navigate('menu')">⬅ Volver</button>
                    </div>
                </div>

                <!-- KPI Stats -->
                <div class="stats-grid" id="stats-grid">
                    <div class="glass-card stat-card">
                        <div class="stat-header">
                            <div class="stat-icon cpu">💻</div>
                            <span class="stat-change up" id="stat-cpu-change">—</span>
                        </div>
                        <div class="stat-value" id="stat-cpu">—</div>
                        <div class="stat-label">CPU Utilización</div>
                    </div>
                    <div class="glass-card stat-card">
                        <div class="stat-header">
                            <div class="stat-icon memory">🧠</div>
                            <span class="stat-change up" id="stat-mem-change">—</span>
                        </div>
                        <div class="stat-value" id="stat-memory">—</div>
                        <div class="stat-label">Memoria RAM</div>
                    </div>
                    <div class="glass-card stat-card">
                        <div class="stat-header">
                            <div class="stat-icon sessions">🔗</div>
                        </div>
                        <div class="stat-value" id="stat-sessions">—</div>
                        <div class="stat-label">Sesiones Activas</div>
                    </div>
                    <div class="glass-card stat-card">
                        <div class="stat-header">
                            <div class="stat-icon interfaces">🌐</div>
                        </div>
                        <div class="stat-value" id="stat-interfaces">—</div>
                        <div class="stat-label">Interfaces Activas</div>
                    </div>
                </div>

                <!-- Charts & Interface Status -->
                <div class="dashboard-grid">
                    <div class="glass-card chart-card">
                        <div class="chart-header">
                            <span class="chart-title">Tráfico de red (Tiempo real)</span>
                            <span class="badge badge-info"><span class="badge-dot"></span> En vivo</span>
                        </div>
                        <div class="chart-container">
                            <canvas id="traffic-chart"></canvas>
                        </div>
                    </div>

                    <div>
                        <div class="glass-card events-card" style="margin-bottom: var(--spacing-md);">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span class="events-title">Estado de Interfaces</span>
                                <span class="text-muted" style="font-size: var(--font-size-xs);" id="if-count-label"></span>
                            </div>
                            <div class="interface-list" id="interface-status-list">
                                <div class="loading-state"><div class="spinner"></div><span>Cargando...</span></div>
                            </div>
                        </div>

                        <div class="glass-card events-card">
                            <span class="events-title">Eventos Recientes</span>
                            <div id="recent-events">
                                <div class="loading-state"><div class="spinner"></div><span>Cargando...</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- System Info -->
                <div class="glass-card" style="padding: var(--spacing-md); margin-top: var(--spacing-md);">
                    <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-lg); font-size: var(--font-size-sm);">
                        <div><span class="text-muted">Hostname:</span> <strong id="sys-hostname">—</strong></div>
                        <div><span class="text-muted">Firmware:</span> <strong id="sys-firmware">—</strong></div>
                        <div><span class="text-muted">Serial:</span> <strong id="sys-serial">—</strong></div>
                        <div><span class="text-muted">Uptime:</span> <strong id="sys-uptime">—</strong></div>
                    </div>
                </div>
            </div>
        `;

        loadData();
        startAutoRefresh();
    }

    // ---- Load All Data ----
    async function loadData() {
        try {
            const [statsRes, trafficRes, interfacesRes, logsRes] = await Promise.all([
                API.getStats(),
                API.getTraffic(),
                API.getInterfaces(),
                API.getLogs({ per_page: 5 })
            ]);

            if (statsRes.success) renderStats(statsRes.data);
            if (trafficRes.success) renderTrafficChart(trafficRes.data);
            if (interfacesRes.success) renderInterfaceStatus(interfacesRes.data);
            if (logsRes.success) renderRecentEvents(logsRes.data);

            updateTimestamp();
        } catch (error) {
            console.error('Dashboard load error:', error);
        }
    }

    // ---- Render Stats KPIs ----
    function renderStats(data) {
        const cpuEl = document.getElementById('stat-cpu');
        const memEl = document.getElementById('stat-memory');
        const sessEl = document.getElementById('stat-sessions');
        const ifEl = document.getElementById('stat-interfaces');

        if (cpuEl) {
            cpuEl.textContent = data.cpu + '%';
            const cpuChange = document.getElementById('stat-cpu-change');
            if (cpuChange) {
                cpuChange.className = `stat-change ${data.cpu > 70 ? 'down' : 'up'}`;
                cpuChange.textContent = data.cpu > 70 ? '⚠ Alto' : '✓ Normal';
            }
        }
        if (memEl) {
            memEl.textContent = data.memory + '%';
            const memChange = document.getElementById('stat-mem-change');
            if (memChange) {
                memChange.className = `stat-change ${data.memory > 80 ? 'down' : 'up'}`;
                memChange.textContent = data.memory > 80 ? '⚠ Alto' : '✓ Normal';
            }
        }
        if (sessEl) sessEl.textContent = data.sessions.toLocaleString();
        if (ifEl) ifEl.textContent = `${data.interfaces_up}/${data.interfaces_total}`;

        // System info
        const hostname = document.getElementById('sys-hostname');
        const firmware = document.getElementById('sys-firmware');
        const serial = document.getElementById('sys-serial');
        const uptime = document.getElementById('sys-uptime');

        if (hostname) hostname.textContent = data.hostname || '—';
        if (firmware) firmware.textContent = data.firmware || '—';
        if (serial) serial.textContent = data.serial || '—';
        if (uptime) uptime.textContent = formatUptime(data.uptime) || '—';
    }

    // ---- Render Traffic Chart ----
    function renderTrafficChart(data) {
        const canvas = document.getElementById('traffic-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const labels = data.map(d => {
            const date = new Date(d.timestamp);
            return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        });

        if (trafficChart) {
            trafficChart.data.labels = labels;
            trafficChart.data.datasets[0].data = data.map(d => d.rx);
            trafficChart.data.datasets[1].data = data.map(d => d.tx);
            trafficChart.update('none');
            return;
        }

        trafficChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'RX (Mbps)',
                        data: data.map(d => d.rx),
                        borderColor: '#4facfe',
                        backgroundColor: 'rgba(79, 172, 254, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 5
                    },
                    {
                        label: 'TX (Mbps)',
                        data: data.map(d => d.tx),
                        borderColor: '#00f2fe',
                        backgroundColor: 'rgba(0, 242, 254, 0.05)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: 'rgba(255,255,255,0.7)',
                            font: { family: "'Inter', sans-serif", size: 12 },
                            usePointStyle: true,
                            pointStyleWidth: 8
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(13, 40, 71, 0.95)',
                        titleColor: '#fff',
                        bodyColor: '#a0c4ff',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        titleFont: { family: "'Inter', sans-serif" },
                        bodyFont: { family: "'Inter', sans-serif" }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                        ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 }, maxRotation: 0 }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                        ticks: {
                            color: 'rgba(255,255,255,0.4)',
                            font: { size: 11 },
                            callback: v => v + ' Mbps'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // ---- Render Interface Status ----
    function renderInterfaceStatus(interfaces) {
        const list = document.getElementById('interface-status-list');
        const countLabel = document.getElementById('if-count-label');
        if (!list) return;

        const upCount = interfaces.filter(i => i.status === 'up').length;
        if (countLabel) countLabel.textContent = `${upCount}/${interfaces.length} activas`;

        list.innerHTML = interfaces.map(iface => `
            <div class="interface-item">
                <div class="if-info">
                    <span class="badge ${iface.status === 'up' ? 'badge-up' : 'badge-down'}">
                        <span class="badge-dot"></span>
                        ${iface.status.toUpperCase()}
                    </span>
                    <div>
                        <div class="if-name">${iface.name}</div>
                        <div class="if-ip">${iface.ip || '—'}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // ---- Render Recent Events ----
    function renderRecentEvents(logs) {
        const container = document.getElementById('recent-events');
        if (!container) return;

        const iconMap = {
            emergency: '🔴',
            critical: '🟠',
            warning: '🟡',
            notice: '🔵',
            information: '🟢'
        };

        const bgMap = {
            emergency: 'rgba(255,71,87,0.15)',
            critical: 'rgba(255,107,107,0.15)',
            warning: 'rgba(255,212,59,0.15)',
            notice: 'rgba(79,172,254,0.15)',
            information: 'rgba(81,207,102,0.15)'
        };

        container.innerHTML = logs.map(log => {
            const date = new Date(log.date);
            const timeStr = date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
            return `
                <div class="event-item">
                    <div class="event-icon" style="background:${bgMap[log.severity] || bgMap.information}">${iconMap[log.severity] || '⚪'}</div>
                    <div>
                        <div class="event-text">${log.event}</div>
                        <div class="event-time">${timeStr} · ${log.src_ip}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ---- Helpers ----
    function formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${mins}m`;
    }

    function updateTimestamp() {
        const el = document.getElementById('dashboard-last-update');
        if (el) {
            el.textContent = 'Actualizado: ' + new Date().toLocaleTimeString('es-CL');
        }
    }

    function startAutoRefresh() {
        stopAutoRefresh();
        refreshInterval = setInterval(() => loadData(), REFRESH_RATE);
    }

    function stopAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }

    return {
        render,
        refresh: loadData,
        destroy() {
            stopAutoRefresh();
            if (trafficChart) {
                trafficChart.destroy();
                trafficChart = null;
            }
        }
    };
})();
