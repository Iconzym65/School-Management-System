const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const PORTAL_REDIRECTS = {
    admin: '/admin-portal',
    teacher: '/teacher-portal',
    student: '/student-portal',
};

export const getStoredToken = () => localStorage.getItem('token') || localStorage.getItem('auth_token') || '';

export const clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
};

export const resolvePortalRoute = (role) => PORTAL_REDIRECTS[String(role || '').toLowerCase()] || '/login';

export const validatePortalAccess = async (expectedRole) => {
    const token = getStoredToken();

    if (!token) {
        window.location.replace('/login');
        throw new Error('Authentication required.');
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        clearAuth();
        window.location.replace('/login');
        throw new Error('Authentication expired.');
    }

    const payload = await response.json();
    const user = payload.data?.user || payload.user;
    const role = user?.role?.slug || user?.role_slug;
    const canonicalRedirect = payload.redirect || resolvePortalRoute(role);

    if (role !== expectedRole) {
        clearAuth();
        if (canonicalRedirect && canonicalRedirect !== window.location.pathname) {
            window.location.replace(canonicalRedirect);
        } else {
            window.location.replace('/login');
        }
        throw new Error('Insufficient privileges.');
    }

    return user;
};
