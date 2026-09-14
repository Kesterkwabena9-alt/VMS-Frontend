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
async function login(username, password) {

    const response = await fetch(
        `${API_BASE_URL}/v1/users/sign-in`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                username,
                password
            })
        }
    );

    if (!response.ok) {

        const errorData =
            await response.json();

        throw {
            status: response.status,
            errorCode: errorData.errorCode,
            message: errorData.message
        };
    }

    const authData =
        await response.json();

    saveAuthData(authData);

    routeUser(authData.role);

    return authData;
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