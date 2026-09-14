// api.js

const API_BASE_URL = "https://vms-utsdevelopers.onrender.com";

/**
 * Generic API Request Function
 *
 * Supports:
 * - GET
 * - POST
 * - PUT
 * - DELETE
 * - PATCH
 * - JWT Authentication
 * - Custom Spring Boot Exceptions
 * - 401 / 403 Handling
 * - Network Error Handling
 * - JSON Responses
 */

async function apiRequest(
    endpoint,
    method = "GET",
    body = null
) {

    const token = localStorage.getItem("token");

    const headers = {
        "Accept": "application/json"
    };

    // Add JWT only if available
    if (token) {
        headers["Authorization"] =
            `Bearer ${token}`;
    }

    // Add content type only when sending data
    if (body) {
        headers["Content-Type"] =
            "application/json";
    }

    const config = {
        method,
        headers
    };

    if (body) {
        config.body =
            JSON.stringify(body);
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}${endpoint}`,
            config
        );

        /*
         * Authentication / Authorization
         */
        if (response.status === 401) {

            localStorage.clear();

            alert(
                "Your session has expired. Please login again."
            );

            window.location.href =
                "login.html";

            return;
        }

        if (response.status === 403) {
            const responseText = await response.text();
            let errorData = {};

            try {
                errorData = responseText ? JSON.parse(responseText) : {};
            } catch {
                errorData = { message: responseText };
            }

            throw {
                status: response.status,
                message: errorData.message || errorData.error || responseText || `Request was rejected with HTTP ${response.status}.`,
                details: errorData.details || errorData.errors
            };
        }

        /*
         * No Content
         */
        if (response.status === 204) {
            return null;
        }

        /*
         * Handle Spring Boot Custom Exceptions
         */
        if (!response.ok) {

            let errorData = {};

            try {

                errorData =
                    await response.json();

            } catch {

                throw {
                    status:
                        response.status,
                    message:
                        "Unexpected server error"
                };
            }

            throw {
                status:
                    response.status,

                errorCode:
                    errorData.errorCode,

                message:
                    errorData.message || errorData.error || `Request failed with status ${response.status}.`,

                details:
                    errorData.details || errorData.errors,

                timeStamp:
                    errorData.timeStamp
            };
        }

        /*
         * Success responses may be JSON, plain text, or empty.
         */
        const responseText = await response.text();
        if (!responseText) return null;

        try {
            return JSON.parse(responseText);
        } catch {
            return responseText;
        }

    } catch (error) {

        /*
         * Internet / Server Down
         */
        if (
            error instanceof TypeError
        ) {

            throw {
                message:
                    "Unable to connect to server."
            };
        }

        throw error;
    }
}