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
        "Accept": "application/json",
        "Cache-Control": "no-cache"
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

        const requestUrl = new URL(`${API_BASE_URL}${endpoint}`);
        if (method === "GET") {
            requestUrl.searchParams.set("_vms", Date.now().toString());
            config.cache = "no-store";
        }

        const response = await fetch(requestUrl, config);

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
            const responseText = await response.text();
            let errorData = {};

            try {
                errorData = responseText ? JSON.parse(responseText) : {};
            } catch {
                errorData = { message: responseText };
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

function getPageCollection(response) {
    if (Array.isArray(response)) return response;
    if (!response || typeof response !== "object") return [];

    for (const key of ["content", "items", "results", "visitors", "users", "employees", "data"]) {
        const nested = response[key];
        if (Array.isArray(nested)) return nested;
        if (nested && typeof nested === "object" && nested !== response) {
            const collection = getPageCollection(nested);
            if (collection.length > 0) return collection;
        }
    }

    return [];
}

function getPageMetadata(response) {
    if (!response || typeof response !== "object") return {};
    if (response.page && typeof response.page === "object") return response.page;
    if (response.pagination && typeof response.pagination === "object") return response.pagination;
    if (response.meta && typeof response.meta === "object") return response.meta;
     if (response.data && typeof response.data === "object" && !Array.isArray(response.data)) {
        return getPageMetadata(response.data);
    }
    return response;
}

function getPageTotal(response) {
    const metadata = getPageMetadata(response);
    const total = metadata.totalElements ?? metadata.total_elements ?? metadata.total ?? metadata.count;
    if (total !== undefined && total !== null && Number.isFinite(Number(total))) {
        return Number(total);
    }

    return null;
}

async function getAllPages(endpoint, pageSize = 10) {
    const records = [];
    let page = 1;

    while (true) {
        const response = await apiRequest(`${endpoint}?page=${page}&size=${pageSize}`);
        const pageRecords = getPageCollection(response);
        const metadata = getPageMetadata(response);
        const totalPages = Number(metadata.totalPages ?? metadata.total_pages);
        const totalElements = Number(metadata.totalElements ?? metadata.total_elements);
        const currentPage = Number(metadata.number ?? metadata.page ?? page);
        const isLastPage = metadata.last === true || metadata.isLast === true;
        const hasNextPage = metadata.hasNext ?? metadata.has_next;

        records.push(...pageRecords);

        if (isLastPage || hasNextPage === false) break;
        if (Number.isFinite(totalPages) && currentPage >= totalPages) break;
        if (Number.isFinite(totalElements) && records.length >= totalElements) break;
        if (pageRecords.length < pageSize) break;

        page += 1;
    }

    return records;
}