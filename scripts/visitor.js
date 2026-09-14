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

    function showBadge(visitor) {
        document.getElementById('badge-number').textContent = visitor.tagNumber || visitor.tag_number || 'Pending';
        document.getElementById('badge-visitor').textContent = `${visitor.first_name} ${visitor.last_name}`;
        document.getElementById('badge-workflow').textContent = workflow === 'check-out' ? 'Checked out' : 'Checked in';
        badgeResult.hidden = false;
    }

    visitorForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const visitor = Object.fromEntries(new FormData(visitorForm));
        const submitButton = visitorForm.querySelector('.submit-button');

        submitButton.disabled = true;
        try {
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