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

searchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const tag = tagInput.value.trim();
    if (!tag) return;

    checkoutButton.disabled = true;
    searchMessage.textContent = '';
    checkoutMessage.textContent = 'Checking out visitor...';
    try {
        const response = await checkOutVisitor(tag);
        const returnedTag = typeof response === 'string' || typeof response === 'number' ? response : response?.tag || tag;
        detailsCard.hidden = false;
        document.getElementById('visitor-name').textContent = 'Visitor checked out';
        document.getElementById('visitor-tag').textContent = returnedTag;
        document.getElementById('person-visited').textContent = '-';
        document.getElementById('department').textContent = '-';
        document.getElementById('purpose').textContent = '-';
        document.getElementById('check-in-time').textContent = '-';
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