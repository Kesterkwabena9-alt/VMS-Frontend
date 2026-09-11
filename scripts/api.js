// api.js

const API_BASE_URL = "http://localhost:8080";

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
        if (
            response.status === 401 ||
            response.status === 403
        ) {

            localStorage.clear();

            alert(
                "Your session has expired. Please login again."
            );

            window.location.href =
                "login.html";

            return;
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
                    errorData.message,

                details:
                    errorData.details,

                timeStamp:
                    errorData.timeStamp
            };
        }

        /*
         * Success Response
         */
        return await response.json();

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