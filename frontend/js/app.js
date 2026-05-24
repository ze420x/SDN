/**
 * App Module — Router SPA e inicialización
 * Controla la navegación entre vistas y el estado global
 */

const App = (() => {
    let currentView = null;
    let dropdownOpen = false;

    // ---- Initialize App ----
    async function init() {
        // Check backend connection
        const connection = await API.checkConnection();

        // Check if user is already authenticated
        if (Auth.isAuthenticated()) {
            renderAppShell();
            navigate('menu');
        } else {
            renderAppShell();
            navigate('login');
        }

        // Listen for auth expiry
        window.addEventListener('auth:expired', () => {
            navigate('login');
        });

        // Close dropdown on outside click
        document.addEventListener('click', (e) => {
            if (dropdownOpen && !e.target.closest('.user-menu')) {
                closeDropdown();
            }
        });

        // Keyboard shortcut: Escape to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                Admin.closeModal();
                closeDropdown();
            }
        });
    }

    // ---- Render App Shell (Header) ----
    function renderAppShell() {
        const header = document.getElementById('app-header');
        header.innerHTML = `
            <div class="logo" onclick="App.navigate('menu')" style="cursor:pointer;">
                <img src="assets/logo-pinguard.png" alt="PinGuard Logo" class="logo-img">
            </div>
            <div class="header-right">
                <div class="user-menu" id="user-menu-container" style="display:none;">
                    <div class="user-avatar" id="user-avatar" onclick="App.toggleDropdown()"></div>
                    <div class="user-dropdown hidden" id="user-dropdown">
                        <div style="padding: var(--spacing-sm) var(--spacing-md); border-bottom: 1px solid var(--glass-border);">
                            <div style="font-weight:600; font-size: var(--font-size-sm);" id="dropdown-username"></div>
                            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);" id="dropdown-role"></div>
                        </div>
                        <button class="dropdown-item" onclick="App.navigate('menu')">🏠 Menú principal</button>
                        <button class="dropdown-item" onclick="App.navigate('dashboard')">📊 Dashboard</button>
                        <button class="dropdown-item" onclick="App.navigate('admin')">⚙️ Administración</button>
                        <button class="dropdown-item" onclick="App.navigate('logs')">📝 Logs</button>
                        <div class="dropdown-divider"></div>
                        <button class="dropdown-item" onclick="App.handleLogout()" style="color: var(--color-danger);">🚪 Cerrar sesión</button>
                    </div>
                </div>
            </div>
        `;
    }

    // ---- Update Connection Status ----
    // (Removed)

    // ---- Navigate ----
    function navigate(viewName) {
        // Destroy previous view
        if (currentView === 'dashboard') Dashboard.destroy();
        if (currentView === 'logs') Logs.destroy();
        if (currentView === 'admin') Admin.destroy();

        currentView = viewName;
        const main = document.getElementById('app-main');
        const userMenu = document.getElementById('user-menu-container');

        // Show/hide user menu based on auth
        if (viewName === 'login') {
            if (userMenu) userMenu.style.display = 'none';
        } else {
            if (userMenu) {
                userMenu.style.display = 'block';
                updateUserInfo();
            }
        }

        closeDropdown();

        switch (viewName) {
            case 'login':
                renderLogin(main);
                break;
            case 'menu':
                renderMenu(main);
                break;
            case 'dashboard':
                Dashboard.render(main);
                break;
            case 'admin':
                Admin.render(main);
                break;
            case 'logs':
                Logs.render(main);
                break;
            default:
                renderMenu(main);
        }
    }

    // ---- Render Login ----
    function renderLogin(container) {
        container.innerHTML = `
            <div class="login-wrapper">
                <div class="glass-card glass-card-interactive login-card">
                    <div class="login-logo-container">
                        <img src="assets/logo-pinguard.png" alt="PinGuard Logo" class="login-logo-img">
                    </div>
                    <h2>Acceso seguro</h2>
                    <p class="subtitle">Sistema de Monitoreo y Administración de Red</p>

                    <div class="input-group">
                        <label for="login-username">Usuario del sistema</label>
                        <div class="input-icon-wrapper">
                            <span class="input-icon">👤</span>
                            <input type="text" id="login-username" placeholder="Ingrese su usuario" autocomplete="off">
                        </div>
                    </div>

                    <div class="input-group">
                        <label for="login-password">Contraseña</label>
                        <div class="input-icon-wrapper">
                            <span class="input-icon">🔒</span>
                            <input type="password" id="login-password" placeholder="Ingrese su contraseña">
                        </div>
                    </div>

                    <button class="btn btn-primary" id="btn-login" onclick="App.handleLogin()">
                        Ingresar al sistema
                    </button>

                    <p id="login-message" class="message-box"></p>

                    <div style="margin-top: var(--spacing-md); font-size: var(--font-size-xs); color: var(--color-text-muted);">
                        🔐 Conexión segura con el servidor
                    </div>
                </div>
            </div>
        `;

        // Focus username
        setTimeout(() => {
            const input = document.getElementById('login-username');
            if (input) input.focus();
        }, 300);

        // Enter key
        const passInput = document.getElementById('login-password');
        if (passInput) {
            passInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleLogin();
            });
        }

        const userInput = document.getElementById('login-username');
        if (userInput) {
            userInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    document.getElementById('login-password').focus();
                }
            });
        }
    }

    // ---- Handle Login ----
    async function handleLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const message = document.getElementById('login-message');
        const btn = document.getElementById('btn-login');

        if (!username || !password) {
            message.className = 'message-box error';
            message.textContent = '✕ Complete todos los campos';
            return;
        }

        // Loading state
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Verificando...';
        message.className = 'message-box';
        message.textContent = '';

        try {
            await Auth.login(username, password);

            message.className = 'message-box success';
            message.textContent = '✓ Credenciales correctas. Cargando...';

            setTimeout(() => {
                navigate('menu');
            }, 800);
        } catch (error) {
            message.className = 'message-box error';
            message.textContent = `✕ ${error.message}`;
            document.getElementById('login-password').value = '';
            btn.disabled = false;
            btn.textContent = 'Ingresar al sistema';
        }
    }

    // ---- Render Menu ----
    function renderMenu(container) {
        container.innerHTML = `
            <div class="view-container" style="max-width: 900px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: var(--spacing-xl);">
                    <h2 style="font-size: var(--font-size-xl); margin-bottom: var(--spacing-xs);">
                        Bienvenido, <span style="color: var(--color-primary);">${Auth.user?.name || 'Operador'}</span>
                    </h2>
                    <p class="text-secondary" style="font-size: var(--font-size-sm);">
                        Seleccione el módulo al que desea ingresar
                    </p>
                </div>

                <div class="menu-grid">
                    <div class="glass-card glass-card-interactive menu-card" onclick="App.navigate('dashboard')" id="menu-card-dashboard">
                        <div class="card-icon icon-dashboard">📊</div>
                        <h3>Dashboard de monitoreo</h3>
                        <p>Visualice el estado del sistema, tráfico de red, uso de recursos y eventos en tiempo real.</p>
                        <span class="card-arrow">→</span>
                    </div>

                    <div class="glass-card glass-card-interactive menu-card" onclick="App.navigate('admin')" id="menu-card-admin">
                        <div class="card-icon icon-admin">⚙️</div>
                        <h3>Administración Fortinet</h3>
                        <p>Gestione las interfaces del FortiGate. Encienda o apague puertos de red de forma remota.</p>
                        <span class="card-arrow">→</span>
                    </div>

                    <div class="glass-card glass-card-interactive menu-card" onclick="App.navigate('logs')" id="menu-card-logs">
                        <div class="card-icon icon-logs">📝</div>
                        <h3>Visor de logs</h3>
                        <p>Consulte los registros del syslog. Filtre por severidad, busque eventos y analice el tráfico.</p>
                        <span class="card-arrow">→</span>
                    </div>
                </div>

                <div class="app-footer">
                    Sistema de Monitoreo de Red PinGuard v1.0 · ${new Date().getFullYear()}
                </div>
            </div>
        `;
    }

    // ---- Handle Logout ----
    async function handleLogout() {
        await Auth.logout();
        navigate('login');
    }

    // ---- User Menu Dropdown ----
    function toggleDropdown() {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) {
            dropdownOpen = !dropdownOpen;
            dropdown.classList.toggle('hidden', !dropdownOpen);
        }
    }

    function closeDropdown() {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) {
            dropdown.classList.add('hidden');
            dropdownOpen = false;
        }
    }

    function updateUserInfo() {
        const avatar = document.getElementById('user-avatar');
        const username = document.getElementById('dropdown-username');
        const role = document.getElementById('dropdown-role');

        if (avatar) avatar.textContent = Auth.getUserInitials();
        if (username) username.textContent = Auth.user?.name || Auth.user?.username || '';
        if (role) role.textContent = Auth.user?.role || '';
    }

    // ---- Public API ----
    return {
        init,
        navigate,
        handleLogin,
        handleLogout,
        toggleDropdown
    };
})();

// ---- Start App when DOM is ready ----
document.addEventListener('DOMContentLoaded', () => App.init());
