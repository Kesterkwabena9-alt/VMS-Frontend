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
let employees = [];
let editingEmployeeId = null;
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
    if (!response || typeof response !== 'object') return [];

    for (const key of ['content', 'items', 'results', 'visitors', 'data']) {
        const nested = response[key];
        if (Array.isArray(nested)) return nested;
        if (nested && typeof nested === 'object' && nested !== response) {
            const collection = getCollection(nested);
            if (collection.length > 0) return collection;
        }
    }

    return [];
}

function getCount(response) {
    if (typeof response === 'number') return response;
    if (Array.isArray(response)) return response.length;
    if (!response || typeof response !== 'object') return 0;

    const directCount = response.count ?? response.total ?? response.value;
    if (directCount !== undefined && directCount !== null) return Number(directCount);

    for (const key of ['data', 'result', 'stats']) {
        if (response[key] && response[key] !== response) {
            const nestedCount = getCount(response[key]);
            if (nestedCount > 0) return nestedCount;
        }
    }

    return 0;
}

function isCurrentVisitor(visitor) {
    const status = String(visitor.status || visitor.visitStatus || '').toLowerCase().replace(/[-\s]/g, '_');
    const checkedOut = visitor.checkedOut === true || visitor.checked_out === true;
    return !checkedOut && !visitor.checkOutTime && !visitor.checkedOutAt && !visitor.checkOutAt &&
        !visitor.checked_out_time && !visitor.check_out_time && !visitor.check_out_at && !visitor.checked_out_at &&
        !['checked_out', 'checkout', 'completed'].includes(status);
}

function getVisitorKey(visitor) {
    return String(visitor.id ?? visitor.visitorId ?? visitor.tag ?? visitor.tagNumber ?? `${visitor.firstName}-${visitor.lastName}-${visitor.email}`);
}

function getReferenceId(reference) {
    if (reference && typeof reference === 'object') {
        return reference.id ?? reference.userId ?? reference.employeeId ?? reference.user_id ?? reference.employee_id;
    }
    return reference;
}

function getReferenceName(reference, fallback = '-') {
    if (!reference) return fallback;
    if (typeof reference === 'object') {
        const firstName = reference.firstName ?? reference.firstname ?? reference.first_name ?? '';
        const lastName = reference.lastName ?? reference.lastname ?? reference.last_name ?? '';
        return reference.name || `${firstName} ${lastName}`.trim() || reference.email || fallback;
    }
    return String(reference);
}

function findReferenceName(reference, records, fallback) {
    if (reference && typeof reference === 'object') {
        return getReferenceName(reference, fallback);
    }
    const referenceId = getReferenceId(reference);
    const record = records.find((item) => String(item.id) === String(referenceId));
    return record ? record.name : fallback;
}

function normalizeVisitor(visitor, employees = [], users = []) {
    const hostReference = visitor.host ?? visitor.hostId ?? visitor.employee ?? visitor.employeeId;
    const checkedInByReference = visitor.checkedInByUser ?? visitor.checkedInBy ?? visitor.userId ?? visitor.checkedInById;

    const visitorTag = visitor.tag ?? visitor.tagNumber ?? visitor.tag_number;
    const storedCheckoutTimes = JSON.parse(localStorage.getItem('vms-checkout-times') || '{}');
    const storedCheckoutTime = visitorTag === undefined || visitorTag === null
        ? undefined
        : storedCheckoutTimes[String(visitorTag)];

    return {
        ...visitor,
        firstName: visitor.firstName || visitor.firstname || visitor.first_name || '',
        lastName: visitor.lastName || visitor.lastname || visitor.last_name || '',
        first_name: visitor.first_name || visitor.firstName || '',
        last_name: visitor.last_name || visitor.lastName || '',
        email: visitor.email || '',
        phoneNumber: visitor.phoneNumber || visitor.phone_number || visitor.phone || '',
        address: visitor.address || '',
        company: visitor.company || '',
        purpose: visitor.purpose || visitor.purposeOfVisit || visitor.purpose_of_visit || '',
        hostId: getReferenceId(hostReference),
        userId: getReferenceId(checkedInByReference),
        tag: visitor.tag ?? visitor.tagNumber ?? visitor.tag_number ?? '-',
        person_to_see: visitor.person_to_see || visitor.personToSee || visitor.personVisited ||
            findReferenceName(hostReference, employees, '-'),
        checked_in_by: visitor.checked_in_by || visitor.checkedInByName ||
            findReferenceName(checkedInByReference, users, 'Visitor self-service'),
        checkedInTime: visitor.checkedInTime || visitor.checkedInAt || visitor.checkInTime || visitor.checked_in_at || visitor.checked_in_time,
        checkOutTime: visitor.checkOutTime || visitor.checkoutTime || visitor.checkedOutTime || visitor.checkedOutAt || visitor.checkOutAt || visitor.checked_out_at || visitor.check_out_time || visitor.checked_out_time || storedCheckoutTime,
        checked_in_at: visitor.checked_in_at || visitor.checkedInTime || visitor.checkedInAt || visitor.checkInTime || visitor.checked_in_time,
        checked_out_at: visitor.checked_out_at || visitor.checkOutTime || visitor.checkoutTime || visitor.checkedOutTime || visitor.checkedOutAt || visitor.checkOutAt || visitor.check_out_time || visitor.checked_out_time || storedCheckoutTime,
        status: visitor.status || visitor.visitStatus || (visitor.checkOutTime || visitor.checkoutTime || visitor.checkedOutTime || visitor.checked_out_at || storedCheckoutTime ? 'Checked out' : 'Checked in')
    };
}

async function loadDashboardData() {
    const results = await Promise.allSettled([
        getUncheckedVisitors(),
        getTotalVisitorsToday(),
        getTotalVisitorsThisWeek(),
        getTotalVisitorsThisMonth(),
        getAllVisitors(),
        getAllEmployees(),
        getAllUsers()
    ]);
    const value = (index) => results[index].status === 'fulfilled' ? results[index].value : 0;
    const employeeRecords = getCollection(value(5)).map(normalizeEmployee);
    const userRecords = getCollection(value(6)).map(normalizeUser);
    const visitorHistory = getCollection(value(4)).map((visitor) => normalizeVisitor(visitor, employeeRecords, userRecords));

    dashboardData.visitorsToday = getCount(value(1));
    dashboardData.visitorsThisWeek = getCount(value(2));
    dashboardData.visitorsThisMonth = getCount(value(3));
    dashboardData.totalVisitors = getCount(value(4)) || visitorHistory.length;
    dashboardData.totalEmployees = employeeRecords.length || getCount(value(5));
    const uncheckedVisitors = getCollection(value(0))
        .map((visitor) => normalizeVisitor(visitor, employeeRecords, userRecords));
    dashboardData.currentVisitors = Array.from(
        new Map(uncheckedVisitors.map((visitor) => [getVisitorKey(visitor), visitor])).values()
    );
    dashboardData.visitorsCheckedIn = dashboardData.currentVisitors.length;
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
    const userCollection = Array.isArray(response) ? response : response?.content || response?.data || [];
    users = userCollection.map(normalizeUser);
    renderUsers(document.getElementById('user-search').value);
    renderSummary();
}

function normalizeUser(user) {
    const rawStatus = user.status ?? user.userStatus ?? user.accountStatus;
    const isActive = user.active ?? user.enabled ?? user.isActive;
    const firstName = user.firstName ?? user.first_name ?? user.firstname ?? '';
    const lastName = user.lastName ?? user.last_name ?? user.lastname ?? '';
    const fullName = user.name || `${firstName} ${lastName}`.trim();
    const nameParts = fullName.split(/\s+/);

    return {
        ...user,
        id: user.id ?? user.userId ?? user.user_id,
        firstName: firstName || nameParts.shift() || '',
        lastName: lastName || nameParts.join(' '),
        name: fullName,
        email: user.email || user.emailAddress || '',
        role: user.role || user.userRole || '-',
        status: rawStatus || (typeof isActive === 'boolean' ? (isActive ? 'Active' : 'Inactive') : 'Active')
    };
}

function normalizeEmployee(employee) {
    const firstName = employee.firstName ?? employee.firstname ?? employee.first_name ?? '';
    const lastName = employee.lastName ?? employee.lastname ?? employee.last_name ?? '';
    const fullName = employee.name || `${firstName} ${lastName}`.trim();
    const nameParts = fullName.split(/\s+/);

    return {
        ...employee,
        id: employee.id ?? employee.employeeId ?? employee.employee_id,
        firstName: firstName || nameParts.shift() || '',
        lastName: lastName || nameParts.join(' '),
        name: fullName,
        email: employee.email || employee.emailAddress || '',
        department: employee.department || employee.departmentName || '-',
        phoneNumber: employee.phoneNumber ?? employee.phone ?? employee.phone_number ?? '',
        phone: employee.phoneNumber ?? employee.phone ?? employee.phone_number ?? '-'
    };
}

async function loadEmployees() {
    const response = await getAllEmployees();
    employees = getCollection(response).map(normalizeEmployee);
    renderEmployees(document.getElementById('employee-search').value);
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
            <td><span class="user-status ${user.status === 'Active' ? 'active' : 'inactive'}">${escapeHtml(user.status || 'Active')}</span></td>
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
    document.getElementById('user-email').readOnly = false;
    document.getElementById('user-password').required = true;
    document.getElementById('user-password').placeholder = 'Enter password...';
    document.getElementById('user-submit-label').textContent = 'Add user';
    document.getElementById('cancel-user-edit').hidden = true;
}

function setupUserManagement() {
    const userForm = document.getElementById('user-form');
    const userSubmit = userForm.querySelector('.user-submit');

    userForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const firstName = document.getElementById('user-first-name').value.trim();
        const lastName = document.getElementById('user-last-name').value.trim();
        const email = document.getElementById('user-email').value.trim().toLowerCase();
        const password = document.getElementById('user-password').value;
        const role = document.getElementById('user-role').value;
        const requiredFields = [
            ['first name', firstName],
            ['last name', lastName],
            ['email', email],
            ['role', role]
        ];
        if (editingUserId === null || editingUserId === undefined) {
            requiredFields.push(['password', password]);
        }
        const missingFields = requiredFields.filter(([, value]) => !value).map(([field]) => field);

        if (missingFields.length > 0) {
            alert(`Please complete: ${missingFields.join(', ')}.`);
            return;
        }

        userSubmit.disabled = true;
        const originalSubmitLabel = document.getElementById('user-submit-label').textContent;
        document.getElementById('user-submit-label').textContent = 'Saving...';
        try {
            if (editingUserId !== null && editingUserId !== undefined) {
                const userData = { firstname: firstName, lastname: lastName, email, role };
                if (password) userData.password = password;
                if (!password && Object.prototype.hasOwnProperty.call(userData, 'password')) {
                    delete userData.password;
                }
                await updateUser(editingUserId, userData);
            } else {
                await createUser({ firstname: firstName, lastname: lastName, email, password, role });
            }
            resetUserForm();
            await loadUsers();
        } catch (error) {
            const details = error.details ? `\n${error.details}` : '';
            alert(`${error.message || 'Unable to save user.'}${details}`);
        } finally {
            userSubmit.disabled = false;
            document.getElementById('user-submit-label').textContent = originalSubmitLabel;
        }
    });

    document.getElementById('user-search').addEventListener('input', (event) => renderUsers(event.target.value));
    document.getElementById('cancel-user-edit').addEventListener('click', resetUserForm);
    document.getElementById('users-body').addEventListener('click', async (event) => {
        const actionButton = event.target.closest('[data-action]');
        if (!actionButton) return;
        const user = users.find((item) => String(item.id) === actionButton.dataset.userId);
        if (!user) return;
        if (actionButton.dataset.action === 'edit') {
            editingUserId = user.id;
            document.getElementById('user-first-name').value = user.firstName;
            document.getElementById('user-last-name').value = user.lastName;
            const emailInput = document.getElementById('user-email');
            emailInput.value = user.email;
            emailInput.readOnly = true;
            const passwordInput = document.getElementById('user-password');
            passwordInput.value = '';
            passwordInput.required = false;
            passwordInput.placeholder = 'Leave blank to keep current password';
            document.getElementById('user-role').value = user.role;
            document.getElementById('user-submit-label').textContent = 'Save changes';
            document.getElementById('cancel-user-edit').hidden = false;
            document.getElementById('user-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
            document.getElementById('user-first-name').focus();
        }
        if (actionButton.dataset.action === 'delete' && window.confirm(`Delete ${user.name}?`)) {
            try {
                await deleteUser(user.id);
                await loadUsers();
            } catch (error) {
                alert(error.message || 'Unable to delete user.');
            }
        }
    });
}

function renderEmployees(searchTerm = '') {
    const employeesBody = document.getElementById('employees-body');
    const employeesEmpty = document.getElementById('employees-empty');
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const visibleEmployees = employees.filter((employee) =>
        `${employee.name} ${employee.email} ${employee.department}`.toLowerCase().includes(normalizedSearch)
    );

    employeesBody.innerHTML = visibleEmployees.map((employee) => `
        <tr>
            <td><strong>${escapeHtml(employee.name || '-')}</strong></td>
            <td>${escapeHtml(employee.email)}</td>
            <td>${escapeHtml(employee.department)}</td>
            <td>${escapeHtml(employee.phone)}</td>
            <td class="user-actions">
                <button class="table-action" type="button" data-employee-action="edit" data-employee-id="${escapeHtml(employee.id)}" title="Edit employee"><i class="fa-solid fa-pen" aria-hidden="true"></i><span class="sr-only">Edit ${escapeHtml(employee.name)}</span></button>
                <button class="table-action delete" type="button" data-employee-action="delete" data-employee-id="${escapeHtml(employee.id)}" title="Delete employee"><i class="fa-solid fa-trash" aria-hidden="true"></i><span class="sr-only">Delete ${escapeHtml(employee.name)}</span></button>
            </td>
        </tr>
    `).join('');

    employeesEmpty.hidden = visibleEmployees.length > 0;
    document.getElementById('employee-count').textContent = `${employees.length} employee${employees.length === 1 ? '' : 's'}`;
}

function resetEmployeeForm() {
    editingEmployeeId = null;
    document.getElementById('employee-form').reset();
    document.getElementById('employee-submit-label').textContent = 'Add employee';
    document.getElementById('cancel-employee-edit').hidden = true;
}

function setupEmployeeManagement() {
    const employeeForm = document.getElementById('employee-form');
    const employeeSubmit = employeeForm.querySelector('.user-submit');

    employeeForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const employeeData = {
            firstName: document.getElementById('employee-first-name').value.trim(),
            lastName: document.getElementById('employee-last-name').value.trim(),
            email: document.getElementById('employee-email').value.trim().toLowerCase(),
            department: document.getElementById('employee-department').value.trim(),
            phoneNumber: document.getElementById('employee-phone').value.trim()
        };

        const originalSubmitLabel = document.getElementById('employee-submit-label').textContent;
        employeeSubmit.disabled = true;
        document.getElementById('employee-submit-label').textContent = 'Saving...';
        try {
            if (editingEmployeeId !== null && editingEmployeeId !== undefined) {
                await updateEmployee(editingEmployeeId, employeeData);
            }
            else await createEmployee(employeeData);
            resetEmployeeForm();
            await loadEmployees();
        } catch (error) {
            const details = error.details ? `\n${typeof error.details === 'string' ? error.details : JSON.stringify(error.details)}` : '';
            alert(`${error.message || 'Unable to save employee.'}${details}`);
        } finally {
            employeeSubmit.disabled = false;
            document.getElementById('employee-submit-label').textContent = originalSubmitLabel;
        }
    });

    document.getElementById('employee-search').addEventListener('input', (event) => renderEmployees(event.target.value));
    document.getElementById('cancel-employee-edit').addEventListener('click', resetEmployeeForm);
    document.getElementById('employees-body').addEventListener('click', async (event) => {
        const actionButton = event.target.closest('[data-employee-action]');
        if (!actionButton) return;
        const employee = employees.find((item) => String(item.id) === actionButton.dataset.employeeId);
        if (!employee) return;

        if (actionButton.dataset.employeeAction === 'edit') {
            editingEmployeeId = employee.id;
            document.getElementById('employee-first-name').value = employee.firstName;
            document.getElementById('employee-last-name').value = employee.lastName;
            document.getElementById('employee-email').value = employee.email;
            document.getElementById('employee-department').value = employee.department === '-' ? '' : employee.department;
            document.getElementById('employee-phone').value = employee.phoneNumber;
            document.getElementById('employee-submit-label').textContent = 'Save changes';
            document.getElementById('cancel-employee-edit').hidden = false;
            document.getElementById('employee-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
            document.getElementById('employee-first-name').focus();
        }

        if (actionButton.dataset.employeeAction === 'delete' && window.confirm(`Delete ${employee.name}?`)) {
            try {
                await deleteEmployee(employee.id);
                await loadEmployees();
            } catch (error) {
                alert(error.message || 'Unable to delete employee.');
            }
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
            <td>${visitor.checked_in_at ? new Date(visitor.checked_in_at).toLocaleString() : escapeHtml(visitor.checked_in_time || '-')}</td>
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
            <td>${escapeHtml(visitor.phoneNumber || '-')}</td>
            <td>${escapeHtml(visitor.company || '-')}</td>
            <td>${escapeHtml(visitor.person_to_see || '-')}</td>
            <td>${escapeHtml(visitor.checked_in_by || 'Visitor self-service')}</td>
            <td>${escapeHtml(visitor.address || '-')}</td>
            <td>${escapeHtml(visitor.purpose || '-')}</td>
            <td>${escapeHtml(visitor.tag || '-')}</td>
            <td>${visitor.checkedInTime ? new Date(visitor.checkedInTime).toLocaleString() : '-'}</td>
            <td>${visitor.checkOutTime ? new Date(visitor.checkOutTime).toLocaleString() : '-'}</td>
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
.addEventListener('click', async () => {
    const refreshButton = document.getElementById('refresh-button');
    const originalLabel = refreshButton.textContent;
    refreshButton.disabled = true;
    refreshButton.textContent = 'Refreshing...';
    try {
        await loadDashboardData();
    } finally {
        refreshButton.disabled = false;
        refreshButton.textContent = originalLabel;
    }
});
setupNavigation();
setupUserManagement();
setupEmployeeManagement();
setupSettings();
renderDashboard();
loadUsers().catch((error) => {
    console.error('Unable to load users:', error);
    document.getElementById('users-empty').hidden = false;
    document.getElementById('users-empty').textContent = 'Unable to load users.';
});
loadDashboardData().catch((error) => console.error('Unable to load dashboard data:', error));
loadEmployees().catch((error) => {
    console.error('Unable to load employees:', error);
    document.getElementById('employees-empty').hidden = false;
    document.getElementById('employees-empty').textContent = 'Unable to load employees.';
});

setInterval(() => {
    if (!document.hidden) loadDashboardData().catch((error) => console.error('Unable to refresh dashboard:', error));
}, 15000);

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) loadDashboardData().catch((error) => console.error('Unable to refresh dashboard:', error));
});

