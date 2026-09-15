const searchForm = document.getElementById('search-form');
const tagInput = document.getElementById('tag-number');
const searchMessage = document.getElementById('search-message');
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
    if (Array.isArray(response?.content)) return response.content;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.items)) return response.items;
    if (response?.data && typeof response.data === 'object') return [response.data];
    if (response?.visitor && typeof response.visitor === 'object') return [response.visitor];
    if (response?.result && typeof response.result === 'object') return [response.result];
    return response && typeof response === 'object' ? [response] : [];
}

function getVisitorTag(visitor) {
    return visitor?.tag ?? visitor?.tagNumber ?? visitor?.tag_number ??
        visitor?.tagId ?? visitor?.tag_id ?? visitor?.badgeNumber ?? visitor?.badge;
}

function normalizeTag(tag) {
    const value = String(tag ?? '').trim();
    return /^\d+$/.test(value) ? String(Number(value)) : value.toLowerCase();
}

function getCheckOutTime(visitor) {
    return visitor?.checkOutTime || visitor?.checkoutTime || visitor?.checkedOutTime ||
        visitor?.checkedOutAt || visitor?.checkOutAt || visitor?.checked_out_at ||
        visitor?.check_out_time || visitor?.checked_out_time;
}

async function findActiveVisitor(tag) {
    const responses = await Promise.allSettled([
        getUncheckedVisitors(),
        getAllVisitors(),
        searchVisitors(tag)
    ]);
    const visitors = responses.flatMap((result) => result.status === 'fulfilled'
        ? getVisitorCollection(result.value)
        : []);
    return visitors.find((visitor) => {
        const checkoutTime = getCheckOutTime(visitor);
        const status = String(visitor.status || visitor.visitStatus || '')
            .toLowerCase()
            .replace(/[-\s]/g, '_');
        const checkedOut = visitor.checkedOut === true || visitor.checked_out === true;
        return normalizeTag(getVisitorTag(visitor)) === normalizeTag(tag) &&
            !checkoutTime && !checkedOut && !['checked_out', 'checkout', 'completed'].includes(status);
    });
}

searchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const tag = tagInput.value.trim();
    if (!tag) return;

    const submitButton = searchForm.querySelector('button[type="submit"]');
    const originalLabel = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Checking out...';
    searchMessage.textContent = '';
    checkoutMessage.textContent = 'Checking out visitor...';
    try {
        const activeVisitor = await findActiveVisitor(tag);
        const checkoutTag = activeVisitor ? getVisitorTag(activeVisitor) : tag;
        const response = await checkOutVisitor(checkoutTag);
        const checkoutRecord = response && typeof response === 'object'
            ? (response.data && typeof response.data === 'object' ? response.data : response)
            : {};
        const visitor = { ...(activeVisitor || {}), ...checkoutRecord };
        const checkoutTime = getCheckOutTime(visitor) || new Date().toISOString();
        const checkoutTimes = JSON.parse(localStorage.getItem('vms-checkout-times') || '{}');
        checkoutTimes[tag] = checkoutTime;
        localStorage.setItem('vms-checkout-times', JSON.stringify(checkoutTimes));
        checkoutMessage.textContent = response === null || response === undefined ? 'Checked out' : String(response);
        tagInput.value = '';
    } catch (error) {
        const details = error.details
            ? ` ${typeof error.details === 'string' ? error.details : JSON.stringify(error.details)}`
            : '';
        checkoutMessage.textContent = `${error.message || 'Unable to check out the visitor.'}${details}`;
        searchMessage.textContent = error.message || 'Unable to check out the visitor.';
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
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