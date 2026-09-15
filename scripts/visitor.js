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
    const tag = String(tagNumber).trim();

    return await apiRequest(
        `/v1/visitors/check-out?tag=${encodeURIComponent(tag)}`,
        "PUT"
    );
}

/**
 * Get All Visitors
 */
async function getAllVisitors() {
    return await getAllPages("/v1/visitors");
}

/**
 * Get Unchecked Visitors
 */
async function getUncheckedVisitors() {
    return await getAllPages("/v1/visitors/unchecked");
}

async function getUncheckedVisitorsTotal() {
    const response = await apiRequest("/v1/visitors/unchecked?page=0&size=1");
    return getPageTotal(response);
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
        "/v1/visitors/stats/checked-in-today"
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
        employeeSelect.disabled = true;
        employeeSelect.replaceChildren(new Option('Loading employees...', '', true, true));
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
            employeeSelect.disabled = false;
        } catch (error) {
            const message = error.message || 'Unable to load employees';
            employeeSelect.replaceChildren(new Option(message, '', true, true));
            employeeSelect.disabled = true;
            console.error('Unable to load employees:', error);
        }
    }

    loadEmployeeOptions();

    function showBadge(visitor) {
        const badgeNumber = typeof visitor === 'object'
            ? visitor.tagNumber || visitor.tag_number || 'Pending'
            : visitor || 'Pending';
        document.getElementById('badge-number').textContent = badgeNumber;
        document.getElementById('badge-visitor').textContent = typeof visitor === 'object'
            ? `${visitor.first_name || visitor.firstName || ''} ${visitor.last_name || visitor.lastName || ''}`.trim()
            : `${document.getElementById('first_name').value} ${document.getElementById('last_name').value}`.trim();
        document.getElementById('badge-workflow').textContent = workflow === 'check-out' ? 'Checked out' : 'Checked in';
        badgeResult.hidden = false;
    }

    document.getElementById('print-badge').addEventListener('click', () => {
        window.print();
    });

    document.getElementById('download-badge').addEventListener('click', () => {
        const badgeCard = document.getElementById('badge-card').outerHTML;
        const badgeNumber = document.getElementById('badge-number').textContent.trim() || 'visitor';
        const filename = `visitor-badge-${badgeNumber.replace(/[^a-z0-9-_]/gi, '-')}.html`;
        const badgeDocument = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visitor Badge</title>
    <style>
        body { margin: 40px; font-family: Arial, sans-serif; color: #132238; }
        .badge-card { display: grid; gap: 8px; width: min(100%, 420px); padding: 24px; border: 2px dashed #3fa9f5; border-radius: 12px; text-align: center; }
        .badge-label { color: #64748b; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
        .badge-number { color: #123b63; font-size: 2.5rem; letter-spacing: 0.08em; }
        .badge-visitor { font-size: 1.1rem; font-weight: 700; }
        .badge-workflow { color: #1d5c9e; font-size: 0.9rem; }
    </style>
</head>
<body>${badgeCard}</body>
</html>`;
        const blob = new Blob([badgeDocument], { type: 'text/html' });
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = filename;
        downloadLink.click();
        URL.revokeObjectURL(downloadLink.href);
    });

    visitorForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = visitorForm.querySelector('.submit-button');

        submitButton.disabled = true;
        const originalLabel = submitButton.textContent;
        submitButton.textContent = workflow === 'check-out' ? 'Checking out...' : 'Checking in...';
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
            if (workflow === 'check-out' && !visitor.tag_number) {
                throw new Error('Enter the visitor tag number before checking out.');
            }
            const response = workflow === 'check-out'
                ? await checkOutVisitor(visitor.tag_number)
                : await checkInVisitor(visitor);
            showBadge(response || visitor);
        } catch (error) {
            alert(error.message || 'Unable to process the visitor request.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalLabel;
        }
    });
}