const searchForm = document.getElementById('search-form');
const tagInput = document.getElementById('tag-number');
const searchMessage = document.getElementById('search-message');
const detailsCard = document.getElementById('visitor-details');
const tagReturned = document.getElementById('tag-returned');
const checkoutButton = document.getElementById('checkout-button');
const checkoutMessage = document.getElementById('checkout-message');
let selectedVisitor = null;
let durationTimer;

function updateDateTime() {
    const now = new Date();
    document.getElementById('current-time')
    .textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('current-date')
    .textContent = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(checkInTime) {
    const minutes = Math.max(0, Math.floor((Date.now() - checkInTime.getTime()) / 60000));
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

function normalizeVisitor(visitor) {
    const checkInTime = new Date(visitor.checked_in_at || visitor.checkedInAt || visitor.checkInTime);
    return {
        ...visitor,
        name: visitor.name || `${visitor.first_name || visitor.firstName || ''} ${visitor.last_name || visitor.lastName || ''}`.trim(),
        tagNumber: visitor.tagNumber || visitor.tag_number || visitor.tag,
        personVisited: visitor.personVisited || visitor.person_to_see || visitor.personToSee || '-',
        department: visitor.department || '-',
        purpose: visitor.purpose || visitor.purpose_of_visit || '-',
        checkInTime
    };
}

function renderVisitor(visitor) {
    const normalizedVisitor = normalizeVisitor(visitor);
    selectedVisitor = normalizedVisitor;
    document.getElementById('visitor-name').textContent = normalizedVisitor.name;
    document.getElementById('visitor-tag').textContent = normalizedVisitor.tagNumber;
    document.getElementById('person-visited').textContent = normalizedVisitor.personVisited;
    document.getElementById('department').textContent = normalizedVisitor.department;
    document.getElementById('purpose').textContent = normalizedVisitor.purpose;
    document.getElementById('check-in-time').textContent = formatDateTime(normalizedVisitor.checkInTime);
    document.getElementById('visit-duration').textContent = formatDuration(normalizedVisitor.checkInTime);
    detailsCard.hidden = false;
    tagReturned.checked = false;
    tagReturned.disabled = false;
    checkoutButton.disabled = true;
    checkoutMessage.textContent = '';
    clearInterval(durationTimer);
    durationTimer = setInterval(() => {
        document.getElementById('visit-duration').textContent = formatDuration(normalizedVisitor.checkInTime);
    }, 60000);
}

searchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const requestedTag = tagInput.value.trim().toUpperCase();
    try {
        const response = await searchVisitors(requestedTag);
        const results = Array.isArray(response) ? response : response?.content || response?.data || [];
        const visitor = results[0];
        if (!visitor) throw new Error('No active visitor found with that tag number.');
        searchMessage.textContent = '';
        renderVisitor(visitor);
    } catch (error) {
        detailsCard.hidden = true;
        searchMessage.textContent = error.message || 'Unable to search for the visitor.';
    }
});

tagReturned.addEventListener('change', () => {
    checkoutButton.disabled = !tagReturned.checked || !selectedVisitor;
});

checkoutButton.addEventListener('click', async () => {
    if (!selectedVisitor || !tagReturned.checked) return;

    try {
        await checkOutVisitor(String(selectedVisitor.tagNumber));
        checkoutButton.disabled = true;
        tagReturned.disabled = true;
        document.getElementById('status-badge').innerHTML = '<span></span> Checked Out';
        checkoutMessage.textContent = `${selectedVisitor.name} has been checked out successfully.`;
        clearInterval(durationTimer);
    } catch (error) {
        const details = error.details
            ? ` ${typeof error.details === 'string' ? error.details : JSON.stringify(error.details)}`
            : '';
        checkoutMessage.textContent = `${error.message || 'Unable to check out the visitor.'}${details}`;
    }
});

document.querySelectorAll('.tag-example').forEach((button) => {
    button.addEventListener('click', () => {
        tagInput.value = button.dataset.tag;
        searchForm.requestSubmit();
    });
});

updateDateTime();
setInterval(updateDateTime, 1000);