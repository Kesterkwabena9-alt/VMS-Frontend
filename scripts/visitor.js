// visitors.js

/**
 * Check In Visitor
 */
async function checkInVisitor(
    visitorData
) {

    return await apiRequest(
        "/v1/visitors/check-in",
        "POST",
        visitorData
    );
}

/**
 * Check Out Visitor
 */
async function checkOutVisitor(
    tagNumber
) {

    return await apiRequest(
        `/v1/visitors/check-out/${tagNumber}`,
        "PUT"
    );
}

/**
 * Get All Visitors
 */
async function getAllVisitors() {

    return await apiRequest(
        "/v1/visitors"
    );
}

/**
 * Get Unchecked Visitors
 */
async function getUncheckedVisitors() {

    return await apiRequest(
        "/v1/visitors/unchecked"
    );
}

/**
 * Search Visitors
 */
async function searchVisitors(
    searchTerm
) {

    return await apiRequest(
        `/v1/visitors/search?keyword=${encodeURIComponent(searchTerm)}`
    );
}

/**
 * Get Visitors By Date Range
 */
async function getVisitorsByDateRange(
    startDate,
    endDate
) {

    return await apiRequest(
        `/v1/visitors/by-date`
    );
}

/**
 * Total Visitors Today
 */
async function getTotalVisitorsToday() {

    return await apiRequest(
        "/v1/visitors/stats/today"
    );
}

/**
 * Total Checked-In Visitors Today
 */
async function getCheckedInVisitorsToday() {

    return await apiRequest(
        "/v1/visitors/stats/today"
    );
}

/**
 * Total Visitors This Week
 */
async function getTotalVisitorsThisWeek() {

    return await apiRequest(
        "/v1/visitors/stats/week"
    );
}

/**
 * Total Visitors This Month
 */
async function getTotalVisitorsThisMonth() {

    return await apiRequest(
        "/v1/visitors/stats/month"
    );
}

const visitorForm = document.getElementById('visitor-form');

if (visitorForm) {
    const workflow = new URLSearchParams(window.location.search).get('workflow') === 'check-out'
        ? 'check-out'
        : 'check-in';
    const badgeResult = document.getElementById('badge-result');
    const employeeSelect = document.getElementById('employee_id');

    function getEmployeeCollection(response) {
        if (Array.isArray(response)) return response;
        return response?.content || response?.data || response?.items || [];
    }

    function getEmployeeName(employee) {
        const firstName = employee.firstName ?? employee.firstname ?? employee.first_name ?? '';
        const lastName = employee.lastName ?? employee.lastname ?? employee.last_name ?? '';
        return employee.name || `${firstName} ${lastName}`.trim() || employee.email || 'Unnamed employee';
    }

    async function loadEmployeeOptions() {
        try {
            const employees = getEmployeeCollection(await getAllEmployees());
            employeeSelect.replaceChildren(new Option('Select an employee', '', true, true));

            employees.forEach((employee) => {
                const employeeId = employee.id ?? employee.employeeId ?? employee.employee_id;
                if (employeeId === undefined || employeeId === null) return;
                employeeSelect.add(new Option(getEmployeeName(employee), employeeId));
            });

            if (employeeSelect.options.length === 1) {
                employeeSelect.replaceChildren(new Option('No employees available', '', true, true));
            }
        } catch (error) {
            const message = error.message || 'Unable to load employees';
            employeeSelect.replaceChildren(new Option(message, '', true, true));
            employeeSelect.disabled = true;
            console.error('Unable to load employees:', error);
        }
    }

    loadEmployeeOptions();

    function showBadge(visitor) {
        document.getElementById('badge-number').textContent = visitor.tagNumber || visitor.tag_number || 'Pending';
        document.getElementById('badge-visitor').textContent = `${visitor.first_name} ${visitor.last_name}`;
        document.getElementById('badge-workflow').textContent = workflow === 'check-out' ? 'Checked out' : 'Checked in';
        badgeResult.hidden = false;
    }

    visitorForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = visitorForm.querySelector('.submit-button');

        submitButton.disabled = true;
        try {
            const visitor = {
                firstName: document.getElementById('first_name').value.trim(),
                lastName: document.getElementById('last_name').value.trim(),
                email: document.getElementById('email').value.trim().toLowerCase(),
                phoneNumber: document.getElementById('phone_number').value.trim(),
                address: document.getElementById('address').value.trim(),
                company: document.getElementById('company').value.trim(),
                purpose: document.getElementById('purpose_of_visit').value.trim(),
                hostId: employeeSelect.value
            };
            const response = workflow === 'check-out'
                ? await checkOutVisitor(visitor.tag_number)
                : await checkInVisitor(visitor);
            showBadge(response || visitor);
        } catch (error) {
            alert(error.message || 'Unable to process the visitor request.');
        } finally {
            submitButton.disabled = false;
        }
    });
}