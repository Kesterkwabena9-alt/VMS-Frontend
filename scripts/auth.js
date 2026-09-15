// auth.js

const STORAGE_KEYS = {
    TOKEN: "token",
    EMAIL: "email",
    ROLE: "role",
    EXPIRATION: "expirationTime"
};

/**
 * Login User
 */
async function login(email, password) {
    try {
        if (typeof API_BASE_URL !== "string" || !API_BASE_URL) {
            throw new Error("API_BASE_URL is not defined. api.js may not have loaded.");
        }

        const endpoint = `${API_BASE_URL}/v1/users/sign-in`;
        console.info("Sending login request to:", endpoint);

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const responseText = await response.text();
        let responseData = {};

        try {
            responseData = responseText ? JSON.parse(responseText) : {};
        } catch {
            responseData = { message: responseText };
        }

        if (!response.ok) {
            throw {
                status: response.status,
                errorCode: responseData.errorCode,
                message: responseData.message || `Login failed with status ${response.status}.`
            };
        }

        saveAuthData(responseData);
        routeUser(responseData.role);
        return responseData;
    } catch (error) {
        if (error instanceof TypeError) {
            console.error("The browser blocked or could not send the login request.", error);
            throw new Error(
                "The browser could not reach the login server. Check the browser console for CORS, DNS, or HTTPS errors."
            );
        }

        throw error;
    }
}

/**
 * Save Authentication Data
 */
function saveAuthData(authData) {

    localStorage.setItem(
        STORAGE_KEYS.TOKEN,
        authData.token
    );

    localStorage.setItem(
        STORAGE_KEYS.EMAIL,
        authData.email
    );

    localStorage.setItem(
        STORAGE_KEYS.ROLE,
        authData.role
    );

    localStorage.setItem(
        STORAGE_KEYS.EXPIRATION,
        authData.expirationTime
    );
}

/**
 * Logout User
 */
function logout() {
    localStorage.clear();
    window.location.replace("login.html");
}

/**
 * Clear All Auth Data
 */
function clearAuth() {

    localStorage.clear();
}

/**
 * Getters
 */
function getToken() {

    return localStorage.getItem(
        STORAGE_KEYS.TOKEN
    );
}

function getEmail() {

    return localStorage.getItem(
        STORAGE_KEYS.EMAIL
    );
}

function getRole() {

    return localStorage.getItem(
        STORAGE_KEYS.ROLE
    );
}

function getExpirationTime() {

    return localStorage.getItem(
        STORAGE_KEYS.EXPIRATION
    );
}

function getTokenExpirationTime() {
    const token = getToken();
    if (token) {
        const tokenParts = token.split('.');
        try {
            const encodedPayload = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
            const paddedPayload = encodedPayload.padEnd(encodedPayload.length + (4 - encodedPayload.length % 4) % 4, '=');
            const payload = JSON.parse(atob(paddedPayload));
            if (typeof payload.exp === 'number') return payload.exp * 1000;
        } catch {
            return null;
        }

        if (tokenParts.length === 3) return null;
    }

    const storedExpiration = getExpirationTime();
    if (!storedExpiration) return null;
    const numericExpiration = Number(storedExpiration);
    if (Number.isFinite(numericExpiration) && numericExpiration >= 1e12) return numericExpiration;

    const parsedExpiration = /[-T:]/.test(storedExpiration) ? Date.parse(storedExpiration) : NaN;
    return Number.isNaN(parsedExpiration) ? null : parsedExpiration;
}

/**
 * Authentication Check
 */
function isAuthenticated() {

    return !!getToken();
}

/**
 * Role Checks
 */
function isAdmin() {

    return getRole() ===
        "ADMIN";
}

function isReceptionist() {

    return getRole() ===
        "RECEPTIONIST";
}

/**
 * Route User After Login
 */
function routeUser(role) {

    switch (role) {

        case "ADMIN":

            window.location.href =
                "administrator.html";
            break;

        case "RECEPTIONIST":

            window.location.href =
                "receptionist.html";
            break;

        default:

            logout();
    }
}

/**
 * Protect Any Logged-In Page
 */
function requireAuth() {

    if (!isAuthenticated()) {

        window.location.href =
            "login.html";
    }
}

/**
 * Protect Admin Pages
 */
function requireAdmin() {

    if (
        !isAuthenticated() ||
        !isAdmin()
    ) {

        window.location.href =
            "login.html";
    }
}

/**
 * Protect Receptionist Pages
 */
function requireReceptionist() {

    if (
        !isAuthenticated() ||
        !isReceptionist()
    ) {

        window.location.href =
            "login.html";
    }
}