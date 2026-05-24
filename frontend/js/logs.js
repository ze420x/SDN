/**
 * Logs Module — Visor de logs del Syslog
 * Los logs son recibidos vía syslog y almacenados en la base de datos (RDS)
 */

const Logs = (() => {
    let currentPage = 1;
    let currentSeverity = 'all';
    let currentSearch = '';
    let totalPages = 1;
    let searchTimeout = null;

    // ---- Render Logs View ----
    function render(container) {
        container.innerHTML = `
            <div class="view-container">
                <div class="page-header">
                    <div>
                        <div class="breadcrumb">
                            <a onclick="App.navigate('menu')">Menú</a>
                            <span>›</span>
                            <span>Logs del Sistema</span>
                        </div>
                        <h2>📝 Visor de Logs</h2>
                    </div>
                    <div class="flex items-center gap-sm">
                        <button class="btn-icon" onclick="Logs.refresh()" title="Actualizar" id="btn-refresh-logs">🔄</button>
                        <button class="btn btn-secondary btn-sm" onclick="App.navigate('menu')">⬅ Volver</button>
                    </div>
                </div>

                <!-- Toolbar -->
                <div class="logs-toolbar">
                    <div class="search-box">
                        <span class="search-icon">🔍</span>
                        <input type="text" id="logs-search" placeholder="Buscar en logs..." 
                               oninput="Logs.onSearch(this.value)" autocomplete="off">
                    </div>
                    <select id="logs-severity-filter" onchange="Logs.onFilterChange(this.value)">
                        <option value="all">Todas las severidades</option>
                        <option value="emergency">🔴 Emergency</option>
                        <option value="critical">🟠 Critical</option>
                        <option value="warning">🟡 Warning</option>
                        <option value="notice">🔵 Notice</option>
                        <option value="information">🟢 Information</option>
                    </select>
                    <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);" id="logs-result-count"></div>
                </div>

                <!-- Table -->
                <div class="logs-table-wrapper">
                    <table class="logs-table" id="logs-table">
                        <thead>
                            <tr>
                                <th>Severidad</th>
                                <th>Fecha / Hora</th>
                                <th>IP Origen</th>
                                <th>Evento</th>
                                <th>Tipo</th>
                            </tr>
                        </thead>
                        <tbody id="logs-table-body">
                            <tr><td colspan="5">
                                <div class="loading-state"><div class="spinner"></div><span>Cargando logs...</span></div>
                            </td></tr>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <div class="pagination" id="logs-pagination">
                    <span id="logs-page-info">Cargando...</span>
                    <div class="page-buttons" id="logs-page-buttons"></div>
                </div>
            </div>
        `;

        currentPage = 1;
        currentSeverity = 'all';
        currentSearch = '';
        loadLogs();
    }

    // ---- Load Logs ----
    async function loadLogs() {
        try {
            const params = {
                page: currentPage,
                per_page: 10
            };
            if (currentSeverity !== 'all') params.severity = currentSeverity;
            if (currentSearch) params.search = currentSearch;

            const response = await API.getLogs(params);

            if (response.success) {
                renderTable(response.data);
                renderPagination(response.pagination);
            }
        } catch (error) {
            const tbody = document.getElementById('logs-table-body');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="5">
                    <div class="empty-state">
                        <span class="empty-icon">⚠️</span>
                        <span>Error cargando logs: ${error.message}</span>
                    </div>
                </td></tr>`;
            }
        }
    }

    // ---- Render Table ----
    function renderTable(logs) {
        const tbody = document.getElementById('logs-table-body');
        if (!tbody) return;

        if (!logs.length) {
            tbody.innerHTML = `<tr><td colspan="5">
                <div class="empty-state">
                    <span class="empty-icon">📋</span>
                    <span>No se encontraron logs</span>
                </div>
            </td></tr>`;
            return;
        }

        const severityConfig = {
            emergency:   { badge: 'badge-critical', icon: '🔴', label: 'EMERGENCY' },
            critical:    { badge: 'badge-down',     icon: '🟠', label: 'CRITICAL' },
            warning:     { badge: 'badge-warning',  icon: '🟡', label: 'WARNING' },
            notice:      { badge: 'badge-info',     icon: '🔵', label: 'NOTICE' },
            information: { badge: 'badge-up',       icon: '🟢', label: 'INFO' }
        };

        const typeLabels = {
            traffic: '🌐 Tráfico',
            event: '📌 Evento',
            security: '🛡️ Seguridad'
        };

        tbody.innerHTML = logs.map(log => {
            const sev = severityConfig[log.severity] || severityConfig.information;
            const date = new Date(log.date);
            const dateStr = date.toLocaleDateString('es-CL');
            const timeStr = date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            return `
                <tr>
                    <td>
                        <span class="badge ${sev.badge}">
                            <span class="badge-dot"></span>
                            ${sev.label}
                        </span>
                    </td>
                    <td>
                        <div style="font-weight:500">${dateStr}</div>
                        <div style="font-size:var(--font-size-xs);color:var(--color-text-muted)">${timeStr}</div>
                    </td>
                    <td><code style="font-size:var(--font-size-sm);color:var(--color-primary)">${log.src_ip}</code></td>
                    <td>${log.event}</td>
                    <td><span style="font-size:var(--font-size-xs)">${typeLabels[log.type] || log.type}</span></td>
                </tr>
            `;
        }).join('');
    }

    // ---- Render Pagination ----
    function renderPagination(pagination) {
        totalPages = pagination.total_pages;
        currentPage = pagination.page;

        const pageInfo = document.getElementById('logs-page-info');
        const pageButtons = document.getElementById('logs-page-buttons');
        const resultCount = document.getElementById('logs-result-count');

        if (pageInfo) {
            const start = (pagination.page - 1) * pagination.per_page + 1;
            const end = Math.min(pagination.page * pagination.per_page, pagination.total);
            pageInfo.textContent = `Mostrando ${start}-${end} de ${pagination.total} registros`;
        }

        if (resultCount) {
            resultCount.textContent = `${pagination.total} registros encontrados`;
        }

        if (pageButtons) {
            let buttons = '';

            // Previous
            buttons += `<button class="page-btn" ${currentPage <= 1 ? 'disabled' : ''} onclick="Logs.goToPage(${currentPage - 1})">‹</button>`;

            // Page numbers
            const maxButtons = 5;
            let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
            let endPage = Math.min(totalPages, startPage + maxButtons - 1);
            if (endPage - startPage + 1 < maxButtons) {
                startPage = Math.max(1, endPage - maxButtons + 1);
            }

            for (let i = startPage; i <= endPage; i++) {
                buttons += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="Logs.goToPage(${i})">${i}</button>`;
            }

            // Next
            buttons += `<button class="page-btn" ${currentPage >= totalPages ? 'disabled' : ''} onclick="Logs.goToPage(${currentPage + 1})">›</button>`;

            pageButtons.innerHTML = buttons;
        }
    }

    // ---- Event Handlers ----
    function onSearch(value) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearch = value;
            currentPage = 1;
            loadLogs();
        }, 400);
    }

    function onFilterChange(value) {
        currentSeverity = value;
        currentPage = 1;
        loadLogs();
    }

    function goToPage(page) {
        if (page < 1 || page > totalPages) return;
        currentPage = page;
        loadLogs();
    }

    return {
        render,
        refresh: loadLogs,
        onSearch,
        onFilterChange,
        goToPage,
        destroy() {
            clearTimeout(searchTimeout);
        }
    };
})();
