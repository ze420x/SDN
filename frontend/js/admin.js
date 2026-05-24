/**
 * Admin Module — Administración de Interfaces FortiGate
 * Usa PUT /api/v2/cmdb/system/interface/{name} con {"status": "up"/"down"} vía backend
 */

const Admin = (() => {

    // ---- Render Admin Panel ----
    function render(container) {
        container.innerHTML = `
            <div class="view-container">
                <div class="page-header">
                    <div>
                        <div class="breadcrumb">
                            <a onclick="App.navigate('menu')">Menú</a>
                            <span>›</span>
                            <span>Administración</span>
                        </div>
                        <h2>⚙️ Panel de administración</h2>
                    </div>
                    <div class="flex items-center gap-sm">
                        <button class="btn-icon" onclick="Admin.refresh()" title="Actualizar" id="btn-refresh-admin">🔄</button>
                        <button class="btn btn-secondary btn-sm" onclick="App.navigate('menu')">⬅ Volver</button>
                    </div>
                </div>

                <div class="admin-grid">
                    <!-- Interfaces Panel -->
                    <div class="glass-card admin-panel">
                        <h3>🌐 Control de interfaces</h3>
                        <p class="text-muted" style="font-size: var(--font-size-sm); margin-bottom: var(--spacing-md);">
                            Active o desactive interfaces del FortiGate. Los cambios se aplican en tiempo real mediante la API REST.
                        </p>
                        <div id="admin-interfaces-list">
                            <div class="loading-state"><div class="spinner"></div><span>Cargando interfaces...</span></div>
                        </div>
                        <p id="admin-message" class="message-box"></p>
                    </div>

                    <!-- History Panel -->
                    <div class="glass-card admin-panel">
                        <h3>📋 Historial de acciones</h3>
                        <p class="text-muted" style="font-size: var(--font-size-sm); margin-bottom: var(--spacing-md);">
                            Registro de las últimas operaciones realizadas sobre el dispositivo.
                        </p>
                        <div class="history-list" id="admin-history-list">
                            <div class="loading-state"><div class="spinner"></div><span>Cargando historial...</span></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        loadData();
    }

    // ---- Load Data ----
    async function loadData() {
        try {
            const [interfacesRes, historyRes] = await Promise.all([
                API.getInterfaces(),
                API.getActionsHistory()
            ]);

            if (interfacesRes.success) renderInterfaces(interfacesRes.data);
            if (historyRes.success) renderHistory(historyRes.data);
        } catch (error) {
            showMessage('Error cargando datos: ' + error.message, 'error');
        }
    }

    // ---- Render Interfaces List ----
    function renderInterfaces(interfaces) {
        const list = document.getElementById('admin-interfaces-list');
        if (!list) return;

        list.innerHTML = interfaces.map(iface => {
            const isUp = iface.status === 'up';
            const typeIcon = iface.type === 'tunnel' ? '🔒' : '🔌';
            return `
                <div class="admin-row" id="admin-row-${iface.name}">
                    <div class="if-details">
                        <div class="if-name">${typeIcon} ${iface.name}</div>
                        <div class="if-desc">${iface.alias || 'Puerto de red'}</div>
                    </div>
                    <div class="admin-actions">
                        <span class="badge ${isUp ? 'badge-up' : 'badge-down'}" id="badge-${iface.name}">
                            <span class="badge-dot"></span>
                            ${isUp ? 'UP' : 'DOWN'}
                        </span>
                        <label class="switch" id="switch-${iface.name}">
                            <input type="checkbox" ${isUp ? 'checked' : ''} 
                                   onchange="Admin.confirmToggle('${iface.name}', '${iface.alias || iface.name}', this.checked)">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ---- Render History ----
    function renderHistory(history) {
        const list = document.getElementById('admin-history-list');
        if (!list) return;

        if (!history.length) {
            list.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📋</span>
                    <span>Sin acciones registradas</span>
                </div>`;
            return;
        }

        list.innerHTML = history.map(item => {
            const statusIcon = item.status === 'success' ? '✅' : (item.status === 'error' ? '❌' : '⚠️');
            return `
                <div class="history-item">
                    <span class="history-icon">${statusIcon}</span>
                    <span class="history-text">${item.action}</span>
                    <span class="history-time">${item.time}</span>
                </div>
            `;
        }).join('');
    }

    // ---- Confirm Toggle (Modal) ----
    function confirmToggle(interfaceName, alias, newState) {
        const action = newState ? 'ENCENDER' : 'APAGAR';
        const actionClass = newState ? 'btn-primary' : 'btn-danger';
        const icon = newState ? '🟢' : '🔴';

        // Revert checkbox while waiting for confirmation
        const checkbox = document.querySelector(`#switch-${interfaceName} input`);
        if (checkbox) checkbox.checked = !newState;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'confirm-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-icon">${icon}</div>
                <h3>Confirmar acción</h3>
                <p>¿Está seguro de que desea <strong>${action}</strong> la interfaz <strong>${interfaceName}</strong> (${alias})?<br><br>
                <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
                    Esta acción se ejecutará directamente en el FortiGate mediante su API REST.
                </span></p>
                <div class="modal-buttons">
                    <button class="btn btn-secondary" onclick="Admin.closeModal()">Cancelar</button>
                    <button class="btn ${actionClass}" onclick="Admin.executeToggle('${interfaceName}', ${newState})" id="btn-confirm-toggle">
                        ${action}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // ---- Execute Toggle ----
    async function executeToggle(interfaceName, newState) {
        const confirmBtn = document.getElementById('btn-confirm-toggle');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="spinner"></span> Aplicando...';
        }

        const status = newState ? 'up' : 'down';

        try {
            const response = await API.toggleInterface(interfaceName, status);

            if (response.success) {
                closeModal();

                // Update UI
                const checkbox = document.querySelector(`#switch-${interfaceName} input`);
                if (checkbox) checkbox.checked = newState;

                const badge = document.getElementById(`badge-${interfaceName}`);
                if (badge) {
                    badge.className = `badge ${newState ? 'badge-up' : 'badge-down'}`;
                    badge.innerHTML = `<span class="badge-dot"></span> ${newState ? 'UP' : 'DOWN'}`;
                }

                const actionText = `Interfaz ${interfaceName} ${newState ? 'encendida' : 'apagada'}`;
                showMessage(`✓ ${actionText} con éxito`, 'success');

                // Refresh history
                try {
                    const historyRes = await API.getActionsHistory();
                    if (historyRes.success) renderHistory(historyRes.data);
                } catch (e) { /* ignore */ }
            }
        } catch (error) {
            closeModal();

            // Revert checkbox
            const checkbox = document.querySelector(`#switch-${interfaceName} input`);
            if (checkbox) checkbox.checked = !newState;

            showMessage(`✕ Error: ${error.message}`, 'error');
        }
    }

    // ---- Close Modal ----
    function closeModal() {
        const modal = document.getElementById('confirm-modal');
        if (modal) {
            modal.style.animation = 'fadeIn 0.2s ease reverse';
            setTimeout(() => modal.remove(), 200);
        }
    }

    // ---- Show Message ----
    function showMessage(text, type = 'success') {
        const msg = document.getElementById('admin-message');
        if (!msg) return;

        msg.className = `message-box ${type}`;
        msg.textContent = text;

        setTimeout(() => {
            if (msg.textContent === text) {
                msg.textContent = '';
                msg.className = 'message-box';
            }
        }, 5000);
    }

    return {
        render,
        refresh: loadData,
        confirmToggle,
        executeToggle,
        closeModal,
        destroy() {}
    };
})();
