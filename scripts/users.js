// users.js

/**
 * Create User
 */
async function createUser(userData) {

    return await apiRequest(
        "/v1/users",
        "POST",
        userData
    );
}

/**
 * Get User By ID
 */
async function getUserById(userId) {

    return await apiRequest(
        `/v1/users/${userId}`
    );
}

/**
 * Get All Users
 */
async function getAllUsers() {

    return await apiRequest(
        "/v1/users"
    );
}

/**
 * Update User
 */
async function updateUser(
    userId,
    userData
) {

    return await apiRequest(
        `/v1/users/${userId}`,
        "PUT",
        userData
    );
}

/**
 * Delete User
 */
async function deleteUser(
    userId
) {

    return await apiRequest(
        `/v1/users/${userId}`,
        "DELETE"
    );
}

/**
 * Get Total Users
 */
async function getTotalUsers() {

    return await apiRequest(
        "/v1/users/count"
    );
}