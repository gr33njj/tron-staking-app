class AdminPanel {
    constructor() {
        this.currentTab = 'overview';
        this.init();
    }

    async init() {
        // Check if user is authenticated
        if (!adminApi.isAuthenticated()) {
            this.showLoginScreen();
        } else {
            this.showDashboard();
            await this.loadInitialData();
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }

        // Navigation tabs
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const tabName = item.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // Forms
        this.setupForms();

        // Modal close buttons
        const modalCloses = document.querySelectorAll('.modal-close');
        modalCloses.forEach(close => {
            close.addEventListener('click', () => {
                this.hideModal(close.closest('.modal'));
            });
        });

        // Filters
        this.setupFilters();
    }

    setupForms() {
        // Bulk accrual form
        const bulkAccrualForm = document.getElementById('bulkAccrualForm');
        if (bulkAccrualForm) {
            bulkAccrualForm.addEventListener('submit', this.handleBulkAccrual.bind(this));
        }

        // Add accrual form
        const addAccrualForm = document.getElementById('addAccrualForm');
        if (addAccrualForm) {
            addAccrualForm.addEventListener('submit', this.handleAddAccrual.bind(this));
        }
    }

    setupFilters() {
        // Deposit status filter
        const depositFilter = document.getElementById('depositStatusFilter');
        if (depositFilter) {
            depositFilter.addEventListener('change', this.filterDeposits.bind(this));
        }

        // Withdrawal status filter
        const withdrawalFilter = document.getElementById('withdrawalStatusFilter');
        if (withdrawalFilter) {
            withdrawalFilter.addEventListener('change', this.filterWithdrawals.bind(this));
        }

        // User search
        const userSearch = document.getElementById('userSearch');
        if (userSearch) {
            let searchTimeout;
            userSearch.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchUsers(userSearch.value);
                }, 500);
            });
        }
    }

    showLoginScreen() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('adminDashboard').classList.add('hidden');
    }

    showDashboard() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('adminDashboard').classList.remove('hidden');
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.querySelector('.login-btn');
        const loader = document.querySelector('.login-loader');

        try {
            // Show loading state
            loginBtn.disabled = true;
            loader.classList.remove('hidden');

            await adminApi.login(username, password);
            
            // Set admin username
            document.getElementById('adminUsername').textContent = username;
            
            this.showDashboard();
            await this.loadInitialData();

        } catch (error) {
            this.showError('Invalid username or password');
        } finally {
            loginBtn.disabled = false;
            loader.classList.add('hidden');
        }
    }

    handleLogout() {
        adminApi.logout();
    }

    async loadInitialData() {
        try {
            await this.loadOverviewData();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    switchTab(tabName) {
        // Update navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-tab') === tabName) {
                item.classList.add('active');
            }
        });

        // Update content
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            content.classList.remove('active');
        });

        const activeTab = document.getElementById(tabName);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        this.currentTab = tabName;

        // Load tab-specific data
        this.loadTabData(tabName);
    }

    async loadTabData(tabName) {
        try {
            switch (tabName) {
                case 'overview':
                    await this.loadOverviewData();
                    break;
                case 'deposits':
                    await this.loadDeposits();
                    break;
                case 'withdrawals':
                    await this.loadWithdrawals();
                    break;
                case 'accruals':
                    await this.loadAccruals();
                    break;
                case 'users':
                    await this.loadUsers();
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${tabName} data:`, error);
        }
    }

    async loadOverviewData() {
        try {
            const stats = await adminApi.getStats();
            this.updateStatsDisplay(stats);

            // Load pending actions
            const [pendingDeposits, pendingWithdrawals] = await Promise.all([
                adminApi.getPendingDeposits(0, 5),
                adminApi.getPendingWithdrawals(0, 5)
            ]);

            this.updatePendingActions(pendingDeposits, pendingWithdrawals);
            this.updateBadges(stats);

        } catch (error) {
            console.error('Error loading overview:', error);
        }
    }

    updateStatsDisplay(stats) {
        document.getElementById('totalUsers').textContent = stats.total_users;
        document.getElementById('totalDeposits').textContent = parseFloat(stats.total_deposits).toFixed(2);
        document.getElementById('totalAccruals').textContent = parseFloat(stats.total_accruals).toFixed(2);
        document.getElementById('totalWithdrawals').textContent = parseFloat(stats.total_withdrawals).toFixed(2);
    }

    updateBadges(stats) {
        document.getElementById('pendingDepositsBadge').textContent = stats.pending_deposits;
        document.getElementById('pendingWithdrawalsBadge').textContent = stats.pending_withdrawals;
    }

    updatePendingActions(deposits, withdrawals) {
        const pendingActions = document.getElementById('pendingActions');
        const actions = [
            ...deposits.map(d => ({
                ...d,
                type: 'deposit',
                title: `Deposit from User #${d.user_id}`,
                subtitle: `TX: ${d.tx_hash.substring(0, 20)}...`
            })),
            ...withdrawals.map(w => ({
                ...w,
                type: 'withdrawal',
                title: `Withdrawal from User #${w.user_id}`,
                subtitle: `To: ${w.to_address.substring(0, 20)}...`
            }))
        ].slice(0, 10);

        const html = actions.map(action => `
            <div class="pending-item" onclick="viewItem('${action.type}', ${action.id})">
                <div class="pending-info">
                    <div class="pending-title">${action.title}</div>
                    <div class="pending-subtitle">${action.subtitle}</div>
                </div>
                <div class="pending-amount">${parseFloat(action.amount).toFixed(2)} USDT</div>
            </div>
        `).join('');

        pendingActions.innerHTML = html || '<div class="loading">No pending actions</div>';
    }

    async loadDeposits() {
        try {
            const deposits = await adminApi.getPendingDeposits();
            this.displayDeposits(deposits);
        } catch (error) {
            console.error('Error loading deposits:', error);
        }
    }

    displayDeposits(deposits) {
        const depositsList = document.getElementById('depositsList');
        
        const html = deposits.map(deposit => `
            <div class="list-item" data-status="${deposit.status}">
                <div class="item-header">
                    <div class="item-title">User #${deposit.user_id}</div>
                    <div class="item-amount">${parseFloat(deposit.amount).toFixed(2)} USDT</div>
                </div>
                <div class="item-details">
                    <div class="detail-item">
                        <div class="detail-label">Transaction Hash</div>
                        <div class="detail-value">${deposit.tx_hash}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Edit Amount</div>
                        <div class="detail-value">
                            <input type="number" step="0.000001" min="0" value="${parseFloat(deposit.amount).toFixed(6)}" id="amount-input-${deposit.id}" style="width:140px; margin-right:8px;">
                            <button class="action-btn" onclick="setDepositAmount(${deposit.id})">Save</button>
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Status</div>
                        <div class="detail-value">
                            <span class="status-badge status-${deposit.status}">${deposit.status}</span>
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Created</div>
                        <div class="detail-value">${new Date(deposit.created_at).toLocaleString()}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Confirmations</div>
                        <div class="detail-value">${deposit.confirmations}</div>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="action-btn view-btn" onclick="viewDeposit(${deposit.id})">View</button>
                    ${deposit.status === 'pending' ? `
                        <button class="action-btn approve-btn" onclick="approveDeposit(${deposit.id})">Approve</button>
                        <button class="action-btn reject-btn" onclick="rejectDeposit(${deposit.id})">Reject</button>
                    ` : ''}
                </div>
            </div>
        `).join('');

        depositsList.innerHTML = html || '<div class="loading">No deposits found</div>';
    }

    async loadWithdrawals() {
        try {
            const withdrawals = await adminApi.getPendingWithdrawals();
            this.displayWithdrawals(withdrawals);
        } catch (error) {
            console.error('Error loading withdrawals:', error);
        }
    }

    displayWithdrawals(withdrawals) {
        const withdrawalsList = document.getElementById('withdrawalsList');
        
        const html = withdrawals.map(withdrawal => `
            <div class="list-item" data-status="${withdrawal.status}">
                <div class="item-header">
                    <div class="item-title">User #${withdrawal.user_id}</div>
                    <div class="item-amount">${parseFloat(withdrawal.amount).toFixed(2)} USDT</div>
                </div>
                <div class="item-details">
                    <div class="detail-item">
                        <div class="detail-label">To Address</div>
                        <div class="detail-value">${withdrawal.to_address}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Type</div>
                        <div class="detail-value">${withdrawal.withdrawal_type}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Status</div>
                        <div class="detail-value">
                            <span class="status-badge status-${withdrawal.status}">${withdrawal.status}</span>
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Created</div>
                        <div class="detail-value">${new Date(withdrawal.created_at).toLocaleString()}</div>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="action-btn view-btn" onclick="viewWithdrawal(${withdrawal.id})">View</button>
                    ${withdrawal.status === 'pending' ? `
                        <button class="action-btn approve-btn" onclick="approveWithdrawal(${withdrawal.id})">Approve</button>
                        <button class="action-btn reject-btn" onclick="rejectWithdrawal(${withdrawal.id})">Reject</button>
                    ` : ''}
                </div>
            </div>
        `).join('');

        withdrawalsList.innerHTML = html || '<div class="loading">No withdrawals found</div>';
    }

    async loadAccruals() {
        try {
            const accruals = await adminApi.getRecentAccruals();
            this.displayAccruals(accruals);
        } catch (error) {
            console.error('Error loading accruals:', error);
        }
    }

    displayAccruals(accruals) {
        const accrualsList = document.getElementById('accrualsList');
        
        const html = accruals.map(accrual => `
            <div class="list-item">
                <div class="item-header">
                    <div class="item-title">User #${accrual.user_id}</div>
                    <div class="item-amount">${parseFloat(accrual.amount).toFixed(2)} USDT</div>
                </div>
                <div class="item-details">
                    <div class="detail-item">
                        <div class="detail-label">Description</div>
                        <div class="detail-value">${accrual.description || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Created</div>
                        <div class="detail-value">${new Date(accrual.created_at).toLocaleString()}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Admin Comment</div>
                        <div class="detail-value">${accrual.admin_comment || 'N/A'}</div>
                    </div>
                </div>
            </div>
        `).join('');

        accrualsList.innerHTML = html || '<div class="loading">No accruals found</div>';
    }

    async loadUsers() {
        try {
            const users = await adminApi.getUsers();
            // Load balances for each user
            const usersWithBalances = await Promise.all(
                users.map(async (user) => {
                    try {
                        const balance = await adminApi.getUserBalance(user.id);
                        return { ...user, balance };
                    } catch (error) {
                        console.error(`Error loading balance for user ${user.id}:`, error);
                        return { ...user, balance: null };
                    }
                })
            );
            this.displayUsers(usersWithBalances);
            this.populateUserSelect(usersWithBalances);
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    populateUserSelect(users) {
        const select = document.getElementById('accrualUserId');
        if (!select) return;
        
        // Clear existing options except the first one
        select.innerHTML = '<option value="">Select user...</option>';
        
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id; // Use internal ID, not telegram_id
            option.textContent = `${user.first_name} ${user.last_name || ''} (@${user.username || 'N/A'}) - ID: ${user.telegram_id}`;
            select.appendChild(option);
        });
    }

    displayUsers(users) {
        const usersList = document.getElementById('usersList');
        
        const html = users.map(user => `
            <div class="list-item">
                <div class="item-header">
                    <div class="item-title">${user.first_name} ${user.last_name || ''} (@${user.username || 'N/A'})</div>
                    <div class="item-amount">ID: ${user.telegram_id}</div>
                </div>
                <div class="item-details">
                    <div class="detail-item">
                        <div class="detail-label">Balance</div>
                        <div class="detail-value">
                            ${user.balance ? `${parseFloat(user.balance.total_balance).toFixed(6)} USDT` : 'Loading...'}
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Language</div>
                        <div class="detail-value">${user.language_code}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Status</div>
                        <div class="detail-value">
                            <span class="status-badge ${user.is_active ? 'status-approved' : 'status-rejected'}">
                                ${user.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Joined</div>
                        <div class="detail-value">${new Date(user.created_at).toLocaleString()}</div>
                    </div>
                </div>
            </div>
        `).join('');

        usersList.innerHTML = html || '<div class="loading">No users found</div>';
    }

    async handleBulkAccrual(e) {
        e.preventDefault();
        
        const percentage = parseFloat(document.getElementById('bulkPercentage').value);
        const description = document.getElementById('bulkDescription').value;

        if (percentage <= 0 || percentage > 100) {
            this.showError('Percentage must be between 0 and 100');
            return;
        }

        try {
            await adminApi.createBulkAccrual(percentage, description);
            this.showSuccess(`Bulk accrual of ${percentage}% applied successfully!`);
            
            // Reset form
            document.getElementById('bulkAccrualForm').reset();
            
            // Refresh data
            await this.loadOverviewData();
            if (this.currentTab === 'accruals') {
                await this.loadAccruals();
            }
            
        } catch (error) {
            this.showError(error.message);
        }
    }

    async handleAddAccrual(e) {
        e.preventDefault();
        
        const userId = parseInt(document.getElementById('accrualUserId').value);
        const amount = parseFloat(document.getElementById('accrualAmount').value);
        const description = document.getElementById('accrualDescription').value;
        const adminComment = document.getElementById('accrualComment').value;

        try {
            await adminApi.createAccrual({
                user_id: userId,
                amount: amount,
                description: description,
                admin_comment: adminComment || null
            });
            
            this.showSuccess('Accrual added successfully!');
            this.hideModal(document.getElementById('addAccrualModal'));
            
            // Reset form
            document.getElementById('addAccrualForm').reset();
            
            // Refresh data
            await this.loadOverviewData();
            if (this.currentTab === 'accruals') {
                await this.loadAccruals();
            }
            
        } catch (error) {
            this.showError(error.message);
        }
    }

    async searchUsers(query) {
        try {
            const users = await adminApi.getUsers(0, 100, query);
            this.displayUsers(users);
        } catch (error) {
            console.error('Error searching users:', error);
        }
    }

    filterDeposits() {
        const filter = document.getElementById('depositStatusFilter').value;
        const items = document.querySelectorAll('#depositsList .list-item');
        
        items.forEach(item => {
            const status = item.getAttribute('data-status');
            if (filter === 'all' || status === filter) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    filterWithdrawals() {
        const filter = document.getElementById('withdrawalStatusFilter').value;
        const items = document.querySelectorAll('#withdrawalsList .list-item');
        
        items.forEach(item => {
            const status = item.getAttribute('data-status');
            if (filter === 'all' || status === filter) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    showSuccess(message) {
        const modal = document.getElementById('successModal');
        const messageEl = document.getElementById('successMessage');
        
        if (messageEl) {
            messageEl.textContent = message;
        }
        
        this.showModal(modal);
    }

    showError(message) {
        const modal = document.getElementById('errorModal');
        const messageEl = document.getElementById('errorMessage');
        
        if (messageEl) {
            messageEl.textContent = message;
        }
        
        this.showModal(modal);
    }

    showModal(modal) {
        if (modal) {
            modal.classList.add('show');
            setTimeout(() => {
                this.hideModal(modal);
            }, 3000);
        }
    }

    hideModal(modal) {
        if (modal) {
            modal.classList.remove('show');
        }
    }
}

// Global functions
async function refreshOverview() {
    if (window.adminPanel) {
        await window.adminPanel.loadOverviewData();
    }
}

async function loadDeposits() {
    if (window.adminPanel) {
        await window.adminPanel.loadDeposits();
    }
}

async function loadWithdrawals() {
    if (window.adminPanel) {
        await window.adminPanel.loadWithdrawals();
    }
}

async function loadUsers() {
    if (window.adminPanel) {
        await window.adminPanel.loadUsers();
    }
}

function showAddAccrualModal() {
    const modal = document.getElementById('addAccrualModal');
    modal.classList.add('show');
}

async function viewDeposit(depositId) {
    try {
        const deposit = await adminApi.getDeposit(depositId);
        // Show deposit details modal
        // Implementation depends on your modal structure
    } catch (error) {
        console.error('Error viewing deposit:', error);
    }
}

async function approveDeposit(depositId) {
    try {
        await adminApi.updateDeposit(depositId, { status: 'approved' });
        window.adminPanel.showSuccess('Deposit approved successfully!');
        await window.adminPanel.loadTabData(window.adminPanel.currentTab);
        await window.adminPanel.loadOverviewData();
    } catch (error) {
        window.adminPanel.showError(error.message);
    }
}

async function rejectDeposit(depositId) {
    try {
        await adminApi.updateDeposit(depositId, { status: 'rejected' });
        window.adminPanel.showSuccess('Deposit rejected successfully!');
        await window.adminPanel.loadTabData(window.adminPanel.currentTab);
        await window.adminPanel.loadOverviewData();
    } catch (error) {
        window.adminPanel.showError(error.message);
    }
}

async function viewWithdrawal(withdrawalId) {
    try {
        const withdrawal = await adminApi.getWithdrawal(withdrawalId);
        // Show withdrawal details modal
        // Implementation depends on your modal structure
    } catch (error) {
        console.error('Error viewing withdrawal:', error);
    }
}

async function approveWithdrawal(withdrawalId) {
    try {
        await adminApi.updateWithdrawal(withdrawalId, { status: 'approved' });
        window.adminPanel.showSuccess('Withdrawal approved successfully!');
        await window.adminPanel.loadTabData(window.adminPanel.currentTab);
        await window.adminPanel.loadOverviewData();
    } catch (error) {
        window.adminPanel.showError(error.message);
    }
}

async function rejectWithdrawal(withdrawalId) {
    try {
        await adminApi.updateWithdrawal(withdrawalId, { status: 'rejected' });
        window.adminPanel.showSuccess('Withdrawal rejected successfully!');
        await window.adminPanel.loadTabData(window.adminPanel.currentTab);
        await window.adminPanel.loadOverviewData();
    } catch (error) {
        window.adminPanel.showError(error.message);
    }
}

function viewItem(type, id) {
    if (type === 'deposit') {
        viewDeposit(id);
    } else if (type === 'withdrawal') {
        viewWithdrawal(id);
    }
}

async function setDepositAmount(depositId) {
    try {
        const input = document.getElementById(`amount-input-${depositId}`);
        if (!input) return;
        const value = parseFloat(input.value);
        if (isNaN(value) || value < 0) {
            window.adminPanel.showError('Invalid amount');
            return;
        }
        await adminApi.setDepositAmount(depositId, value);
        window.adminPanel.showSuccess('Amount updated');
        await window.adminPanel.loadTabData(window.adminPanel.currentTab);
    } catch (e) {
        try {
            const msg = e && e.message ? e.message : JSON.stringify(e);
            window.adminPanel.showError(msg);
        } catch (_) {
            window.adminPanel.showError('Update failed');
        }
    }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});
