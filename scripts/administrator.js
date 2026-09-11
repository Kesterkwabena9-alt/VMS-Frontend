const dashboardData = {
    visitorsCheckedIn: 0,
    visitorsToday: 0,
    visitorsThisWeek: 0,
    visitorsThisMonth: 0,
    totalVisitors: 0,
    totalEmployees: 0,
    totalUsers: 0,
    currentVisitors: [
    ],
    visitorHistory: [],
    purposes: [
        { label: 'Meeting', count: 0 },
        { label: 'Interview', count: 0 },
        { label: 'Delivery', count: 0 },
        { label: 'Maintenance', count: 0 },
        { label: 'Other', count: 0 }
    ]
};

requireAdmin();

let users = [];
let editingUserId = null;
const defaultSettings = {
    organizationName: 'UTS Developers',
    adminContactEmail: 'admin@utsdevelopers.com',
    visitDuration: '60',
    timeFormat: '12',
    dateFormat: 'MM/DD/YYYY',
    timezone: 'Africa/Accra',
    theme: 'ocean',
    requireApproval: true,
    emailNotifications: false
};

function getVisitorHistory() {
    return dashboardData.visitorHistory.map((visitor) => ({
        ...visitor,
        status: visitor.status || (visitor.checked_out_at ? 'Checked out' : 'Checked in')
    }));
}

function getCollection(response) {
    if (Array.isArray(response)) return response;
    return response?.content || response?.data || response?.items || [];
}

function getCount(response) {
    if (typeof response === 'number') return response;
    if (Array.isArray(response)) return response.length;
    return Number(response?.count ?? response?.total ?? response?.value ?? 0);
}

function normalizeVisitor(visitor) {
    return {
        ...visitor,
        first_name: visitor.first_name || visitor.firstName || '',
        last_name: visitor.last_name || visitor.lastName || '',
        person_to_see: visitor.person_to_see || visitor.personToSee || visitor.personVisited || '-',
        checked_in_by: visitor.checked_in_by || visitor.checkedInBy || '-',
        checked_in_at: visitor.checked_in_at || visitor.checkedInAt || visitor.checkInTime,
        checked_out_at: visitor.checked_out_at || visitor.checkedOutAt || visitor.checkOutTime,
        status: visitor.status || visitor.visitStatus
    };
}

async function loadDashboardData() {
    const results = await Promise.allSettled([
        getCheckedInVisitorsToday(),
        getTotalVisitorsToday(),
        getTotalVisitorsThisWeek(),
        getTotalVisitorsThisMonth(),
        getAllVisitors(),
        getUncheckedVisitors(),
        getAllEmployees()
    ]);
    const value = (index) => results[index].status === 'fulfilled' ? results[index].value : 0;
    const visitorHistory = getCollection(value(4)).map(normalizeVisitor);

    dashboardData.visitorsCheckedIn = getCount(value(0));
    dashboardData.visitorsToday = getCount(value(1));
    dashboardData.visitorsThisWeek = getCount(value(2));
    dashboardData.visitorsThisMonth = getCount(value(3));
    dashboardData.totalVisitors = visitorHistory.length || getCount(value(4));
    dashboardData.totalEmployees = getCount(value(6));
    dashboardData.currentVisitors = getCollection(value(5)).map(normalizeVisitor);
    dashboardData.visitorHistory = visitorHistory;
    renderDashboard();
}

function setupNavigation() {
    const navigationItems = document.querySelectorAll('.nav-item[data-view]');
    const viewPanels = document.querySelectorAll('[data-view-panel]');

    navigationItems.forEach((navigationItem) => {
        navigationItem.addEventListener('click', (event) => {
            event.preventDefault();
            const selectedView = navigationItem.dataset.view;

            viewPanels.forEach((viewPanel) => {
                viewPanel.hidden = viewPanel.dataset.viewPanel !== selectedView;
            });
            navigationItems.forEach((item) => {
                const isActive = item === navigationItem;
                item.classList.toggle('active', isActive);
                if (isActive) item.setAttribute('aria-current', 'page');
                else item.removeAttribute('aria-current');
            });
        });
    });
}

function getSettings() {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem('vms-settings') || '{}') };
}

function applyTheme(theme) {
    document.body.dataset.theme = theme;
}

function renderSettings(settings = getSettings()) {
    document.getElementById('organization-name').value = settings.organizationName;
    document.getElementById('admin-contact-email').value = settings.adminContactEmail;
    document.getElementById('visit-duration').value = settings.visitDuration;
    document.getElementById('time-format').value = settings.timeFormat;
    document.getElementById('date-format').value = settings.dateFormat;
    document.getElementById('timezone').value = settings.timezone;
    document.getElementById('theme').value = settings.theme;
    document.getElementById('require-approval').checked = settings.requireApproval;
    document.getElementById('email-notifications').checked = settings.emailNotifications;
}

function setupSettings() {
    const settingsForm = document.getElementById('settings-form');
    const settingsStatus = document.getElementById('settings-status');

    settingsForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const settings = {
            organizationName: document.getElementById('organization-name').value.trim(),
            adminContactEmail: document.getElementById('admin-contact-email').value.trim(),
            visitDuration: document.getElementById('visit-duration').value,
            timeFormat: document.getElementById('time-format').value,
            dateFormat: document.getElementById('date-format').value,
            timezone: document.getElementById('timezone').value,
            theme: document.getElementById('theme').value,
            requireApproval: document.getElementById('require-approval').checked,
            emailNotifications: document.getElementById('email-notifications').checked
        };
        localStorage.setItem('vms-settings', JSON.stringify(settings));
        applyTheme(settings.theme);
        settingsStatus.textContent = 'Settings saved';
    });

    document.getElementById('theme').addEventListener('change', (event) => applyTheme(event.target.value));

    document.getElementById('reset-settings').addEventListener('click', () => {
        localStorage.removeItem('vms-settings');
        renderSettings();
        applyTheme(defaultSettings.theme);
        settingsStatus.textContent = 'Defaults restored';
    });

    renderSettings();
    applyTheme(getSettings().theme);
}

function greetUser(name) {
    return `Welcome back, ${name}.`;
}

function renderSummary() {
    const summaryItems = [
        ['Visitors checked in now', dashboardData.visitorsCheckedIn],
        ['Visitors today', dashboardData.visitorsToday],
        ['Visitors this week', dashboardData.visitorsThisWeek],
        ['Visitors this month', dashboardData.visitorsThisMonth],
        ['Total visitors', dashboardData.totalVisitors],
        ['Total employees', dashboardData.totalEmployees],
        ['Total system users', users.length]
    ];

    document.getElementById('summary-grid').innerHTML = summaryItems.map(([label, value]) => `
        <article class="summary-card">
            <span class="summary-label">${label}</span>
            <strong class="summary-value">${value}</strong>
        </article>
    `).join('');
}

async function loadUsers() {
    const response = await getAllUsers();
    users = Array.isArray(response) ? response : response?.content || response?.data || [];
    renderUsers(document.getElementById('user-search').value);
    renderSummary();
}

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[character]));
}

function renderUsers(searchTerm = '') {
    const usersBody = document.getElementById('users-body');
    const usersEmpty = document.getElementById('users-empty');
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const visibleUsers = users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(normalizedSearch));

    usersBody.innerHTML = visibleUsers.map((user) => `
        <tr>
            <td><strong>${escapeHtml(user.name)}</strong></td>
            <td>${escapeHtml(user.email)}</td>
            <td>${escapeHtml(user.role)}</td>
            <td><span class="user-status ${user.status === 'Active' ? 'active' : 'inactive'}">${escapeHtml(user.status)}</span></td>
            <td class="user-actions">
                <button class="table-action" type="button" data-action="edit" data-user-id="${escapeHtml(user.id)}" title="Edit user"><i class="fa-solid fa-pen" aria-hidden="true"></i><span class="sr-only">Edit ${escapeHtml(user.name)}</span></button>
                <button class="table-action delete" type="button" data-action="delete" data-user-id="${escapeHtml(user.id)}" title="Delete user"><i class="fa-solid fa-trash" aria-hidden="true"></i><span class="sr-only">Delete ${escapeHtml(user.name)}</span></button>
            </td>
        </tr>
    `).join('');

    usersEmpty.hidden = visibleUsers.length > 0;
    document.getElementById('user-count').textContent = `${users.length} user${users.length === 1 ? '' : 's'}`;
}

function resetUserForm() {
    editingUserId = null;
    document.getElementById('user-form').reset();
    document.getElementById('user-submit-label').textContent = 'Add user';
    document.getElementById('cancel-user-edit').hidden = true;
}

function setupUserManagement() {
    document.getElementById('user-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = document.getElementById('user-name').value.trim();
        const email = document.getElementById('user-email').value.trim().toLowerCase();
        const role = document.getElementById('user-role').value;

        if (editingUserId) {
            await updateUser(editingUserId, { name, email, role });
        } else {
            await createUser({ name, email, role });
        }
        resetUserForm();
        await loadUsers();
    });

    document.getElementById('user-search').addEventListener('input', (event) => renderUsers(event.target.value));
    document.getElementById('cancel-user-edit').addEventListener('click', resetUserForm);
    document.getElementById('users-body').addEventListener('click', async (event) => {
        const actionButton = event.target.closest('[data-action]');
        if (!actionButton) return;
        const user = users.find((item) => item.id === actionButton.dataset.userId);
        if (!user) return;
        if (actionButton.dataset.action === 'edit') {
            editingUserId = user.id;
            document.getElementById('user-name').value = user.name;
            document.getElementById('user-email').value = user.email;
            document.getElementById('user-role').value = user.role;
            document.getElementById('user-submit-label').textContent = 'Save changes';
            document.getElementById('cancel-user-edit').hidden = false;
            document.getElementById('user-name').focus();
        }
        if (actionButton.dataset.action === 'delete' && window.confirm(`Delete ${user.name}?`)) {
            await deleteUser(user.id);
            await loadUsers();
        }
    });
}

function renderCurrentVisitors() {
    const tableBody = document.getElementById('current-visitors-body');
    const emptyMessage = document.getElementById('empty-message');

    tableBody.innerHTML = dashboardData.currentVisitors.map((visitor) => `
        <tr>
            <td>
                <span class="visitor-name">${visitor.first_name} ${visitor.last_name}</span>
                <span class="visitor-email">${visitor.email}</span>
            </td>
            <td>${visitor.company}</td>
            <td>${visitor.person_to_see}</td>
            <td>${visitor.checked_in_by}</td>
            <td>${visitor.checked_in_time}</td>
            <td><span class="status-pill">Checked in</span></td>
        </tr>
    `).join('');

    emptyMessage.hidden = dashboardData.currentVisitors.length > 0;
}

function renderVisitorHistory() {
    const historyBody = document.getElementById('history-body');
    const historyEmpty = document.getElementById('history-empty');
    const visitorHistory = getVisitorHistory();

    historyBody.innerHTML = visitorHistory.map((visitor) => `
        <tr>
            <td>
                <span class="visitor-name">${escapeHtml(`${visitor.first_name} ${visitor.last_name}`)}</span>
                <span class="visitor-email">${escapeHtml(visitor.email)}</span>
            </td>
            <td>${escapeHtml(visitor.company || '-')}</td>
            <td>${escapeHtml(visitor.person_to_see || '-')}</td>
            <td>${escapeHtml(visitor.checked_in_by || 'Visitor self-service')}</td>
            <td>${visitor.checked_in_at ? new Date(visitor.checked_in_at).toLocaleString() : escapeHtml(visitor.checked_in_time || '-')}</td>
            <td><span class="status-pill">${escapeHtml(visitor.status)}</span></td>
        </tr>
    `).join('');

    historyEmpty.hidden = visitorHistory.length > 0;
    document.getElementById('history-count').textContent = `${visitorHistory.length} visit${visitorHistory.length === 1 ? '' : 's'}`;
}

function renderPurposeInsights() {
    const purposeList = document.getElementById('purpose-list');
    if (!purposeList) return;
    const highestCount = Math.max(
        1,
        ...dashboardData.purposes.map((purpose) => purpose.count)
    );

    purposeList.innerHTML = dashboardData.purposes.map((purpose) => `
        <div class="purpose-row">
            <div class="purpose-label">
                <span>${purpose.label}</span>
                <strong>${purpose.count}</strong>
            </div>
            <div class="progress-track">
             
                <div class="progress-bar" 
                style="width: ${(purpose.count / highestCount) * 100}%"
                ></div>
            </div>
        </div>
    `).join('');
}

function renderDashboard() {
    renderSummary();
    renderCurrentVisitors();
    renderVisitorHistory();
    renderPurposeInsights();
    document.getElementById('greeting').textContent = `${greetUser('Administrator')} Monitor visitor activity and workplace access.`;
}

document.getElementById('refresh-button')
.addEventListener('click', renderDashboard);
setupNavigation();
setupUserManagement();
setupSettings();
renderDashboard();
loadUsers().catch((error) => {
    console.error('Unable to load users:', error);
    document.getElementById('users-empty').hidden = false;
    document.getElementById('users-empty').textContent = 'Unable to load users.';
});
loadDashboardData().catch((error) => console.error('Unable to load dashboard data:', error));

