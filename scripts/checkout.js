const searchForm = document.getElementById('search-form');
const tagInput = document.getElementById('tag-number');
const searchMessage = document.getElementById('search-message');
const detailsCard = document.getElementById('visitor-details');
const checkoutButton = document.getElementById('checkout-button');
const checkoutMessage = document.getElementById('checkout-message');

function updateDateTime() {
    const now = new Date();
    document.getElementById('current-time')
    .textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('current-date')
    .textContent = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function getVisitorCollection(response) {
    if (Array.isArray(response)) return response;
    return response?.content || response?.data || response?.items || [];
}

function getVisitorTag(visitor) {
    return visitor?.tag ?? visitor?.tagNumber ?? visitor?.tag_number;
}

function getHostReference(visitor) {
    return visitor?.host ?? visitor?.hostId ?? visitor?.employee ?? visitor?.employeeId;
}

function getHostName(host) {
    if (!host) return '';
    if (typeof host === 'string' || typeof host === 'number') return String(host);
    const firstName = host.firstName ?? host.firstname ?? host.first_name ?? '';
    const lastName = host.lastName ?? host.lastname ?? host.last_name ?? '';
    return host.name || `${firstName} ${lastName}`.trim() || host.email || '';
}

function getCheckInTime(visitor) {
    return visitor?.checkedInTime || visitor?.checkedInAt || visitor?.checkInTime ||
        visitor?.checked_in_at || visitor?.checked_in_time;
}

function formatCheckInTime(value) {
    return value === undefined || value === null || value === '' ? '-' : String(value);
}

async function findActiveVisitor(tag) {
    const response = await getUncheckedVisitors();
    return getVisitorCollection(response).find((visitor) => String(getVisitorTag(visitor)) === String(tag));
}

async function resolveHost(visitor) {
    const hostReference = getHostReference(visitor);
    if (hostReference && typeof hostReference === 'object') return hostReference;

    const hostId = hostReference;
    if (hostId === undefined || hostId === null || hostId === '') return null;

    try {
        return await getEmployeeById(hostId);
    } catch (error) {
        console.warn('Unable to load visitor host details:', error);
        return null;
    }
}

searchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const tag = tagInput.value.trim();
    if (!tag) return;

    checkoutButton.disabled = true;
    searchMessage.textContent = '';
    checkoutMessage.textContent = 'Checking out visitor...';
    try {
        const activeVisitor = await findActiveVisitor(tag);
        const response = await checkOutVisitor(tag);
        const checkoutRecord = response && typeof response === 'object'
            ? (response.data && typeof response.data === 'object' ? response.data : response)
            : {};
        const visitor = { ...(activeVisitor || {}), ...checkoutRecord };
        const host = await resolveHost(visitor);
        const personVisited = visitor.person_to_see || visitor.personToSee || visitor.personVisited || getHostName(host);
        const department = visitor.department || visitor.departmentName || host?.department || host?.departmentName || '-';
        const purpose = visitor.purpose || visitor.purposeOfVisit || visitor.purpose_of_visit || '-';
        const returnedTag = typeof response === 'string' || typeof response === 'number'
            ? response
            : getVisitorTag(visitor) || tag;
        detailsCard.hidden = false;
        const visitorName = `${visitor.firstName || visitor.first_name || ''} ${visitor.lastName || visitor.last_name || ''}`.trim();
        document.getElementById('visitor-name').textContent = visitorName || 'Visitor checked out';
        document.getElementById('visitor-tag').textContent = returnedTag;
        document.getElementById('person-visited').textContent = personVisited || '-';
        document.getElementById('department').textContent = department;
        document.getElementById('purpose').textContent = purpose;
        document.getElementById('check-in-time').textContent = formatCheckInTime(getCheckInTime(visitor));
        document.getElementById('visit-duration').textContent = '-';
        document.getElementById('status-badge').innerHTML = '<span></span> Checked Out';
        checkoutMessage.textContent = `Visitor with tag ${returnedTag} has been checked out successfully.`;
        tagInput.value = '';
    } catch (error) {
        const details = error.details
            ? ` ${typeof error.details === 'string' ? error.details : JSON.stringify(error.details)}`
            : '';
        checkoutMessage.textContent = `${error.message || 'Unable to check out the visitor.'}${details}`;
        searchMessage.textContent = error.message || 'Unable to check out the visitor.';
        checkoutButton.disabled = false;
    }
});

document.querySelectorAll('.tag-example').forEach((button) => {
    button.addEventListener('click', () => {
        tagInput.value = button.dataset.tag;
        tagInput.focus();
    });
});

updateDateTime();
setInterval(updateDateTime, 1000);