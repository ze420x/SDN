/**
 * Auth Module — Autenticación y gestión de sesión
 */

const Auth = (() => {
    let currentUser = null;

    function getUser() {
        if (!currentUser) {
            const stored = sessionStorage.getItem('user_data');
            if (stored) {
                try { currentUser = JSON.parse(stored); } catch (e) { /* ignore */ }
            }
        }
        return currentUser;
    }

    function isAuthenticated() {
        return API.loadToken() && !!getUser();
    }

    async function login(username, password) {
        if (!username || !password) {
            throw new Error('Complete todos los campos');
        }

        const response = await API.login(username, password);

        if (response.success) {
            API.setToken(response.token);
            currentUser = response.user;
            sessionStorage.setItem('user_data', JSON.stringify(currentUser));
            return currentUser;
        }

        throw new Error('Credenciales incorrectas');
    }

    async function logout() {
        try {
            await API.logout();
        } catch (e) {
            // Ignore logout errors
        }
        API.clearToken();
        currentUser = null;
        sessionStorage.removeItem('user_data');
        sessionStorage.removeItem('auth_token');
    }

    function getUserInitials() {
        const user = getUser();
        if (!user) return '??';
        const name = user.name || user.username || '';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    return {
        get user() { return getUser(); },
        isAuthenticated,
        login,
        logout,
        getUserInitials
    };
})();
