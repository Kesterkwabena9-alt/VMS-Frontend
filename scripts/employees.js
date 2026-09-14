// employees.js

/**
 * Add Employee
 */
async function createEmployee(employeeData) {
    return await apiRequest(
        "/v1/employees/add",
        "POST",
        employeeData
    );
}

/**
 * Get Employee By ID
 */
async function getEmployeeById(employeeId) {
    return await apiRequest(
        `/v1/employees/{id}${employeeId}`
    );
}

/**
 * Get All Employees
 */
async function getAllEmployees() {
    return await apiRequest(
        "/v1/employees"
    );
}

/**
 * Update Employee
 */
async function updateEmployee(
    employeeId,
    employeeData
) {
    return await apiRequest(
        `/v1/employees/{id}${employeeId}`,
        "PUT",
        employeeData
    );
}

/**
 * Delete an Employee
 */
async function deleteEmployee(
    employeeId
) {
    return await apiRequest(
        `/v1/employees/{id}${employeeId}`,
        "DELETE"
    );
}

/**
 * Search Employees
 */
async function searchEmployees(
    searchTerm
) {
    return await apiRequest(
        `/v1/employees/search?keyword={keyword}${encodeURIComponent(searchTerm)}`
    );
}

/**
 * Total Employees
 */
async function getTotalEmployees() {
    return await apiRequest(
        "/v1/employees/stats/total"
    );
}