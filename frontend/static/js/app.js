class TronStakingApp {
    constructor() {
        this.telegramUser = null;
        this.currentBalance = null;
        this.currentTab = 'dashboard';
        
        this.init();
    }

    async init() {
        try {
            // Initialize Telegram WebApp
            if (window.Telegram && window.Telegram.WebApp) {
                const tg = window.Telegram.WebApp;
                tg.ready();
                tg.expand();
                
                // Get user data from Telegram
                if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
                    this.telegramUser = tg.initDataUnsafe.user;
                    
                    // Authenticate user
                    await this.authenticateUser();
                }
                
                // Set theme
                document.body.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#0a0a0a');
                document.body.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#ffffff');
            } else {
                // For testing outside Telegram
                this.telegramUser = {
                    id: 123456789,
                    first_name: "Test",
                    last_name: "User",
                    username: "testuser",
                    language_code: "en"
                };
                await this.authenticateUser();
            }
            
            // Initialize language
            initializeLanguage();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadDashboardData();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize application');
            this.hideLoadingScreen();
        }
    }

    async authenticateUser() {
        try {
            const user = await api.authenticateUser(this.telegramUser);
            console.log('User authenticated:', user);
        } catch (error) {
            console.error('Authentication failed:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Tab navigation
        const navTabs = document.querySelectorAll('.nav-tab');
        navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // Language switch
        const langSwitch = document.getElementById('langSwitch');
        if (langSwitch) {
            langSwitch.addEventListener('click', this.showLanguageMenu.bind(this));
        }

        // Balance refresh
        const refreshBalance = document.getElementById('refreshBalance');
        if (refreshBalance) {
            refreshBalance.addEventListener('click', this.refreshBalance.bind(this));
        }

        // Forms
        this.setupForms();

        // Modal close buttons
        const modalCloses = document.querySelectorAll('.modal-close');
        modalCloses.forEach(close => {
            close.addEventListener('click', () => {
                this.hideModal(close.closest('.modal'));
            });
        });

        // History filter
        const historyFilter = document.getElementById('historyFilter');
        if (historyFilter) {
            historyFilter.addEventListener('change', this.filterHistory.bind(this));
        }
    }

    setupForms() {
        // Deposit form
        const depositForm = document.getElementById('depositForm');
        if (depositForm) {
            depositForm.addEventListener('submit', this.handleDepositSubmit.bind(this));
        }

        // Withdrawal form
        const withdrawForm = document.getElementById('withdrawForm');
        if (withdrawForm) {
            withdrawForm.addEventListener('submit', this.handleWithdrawalSubmit.bind(this));
        }

        // Amount input for withdrawal
        const withdrawAmount = document.getElementById('withdrawAmount');
        if (withdrawAmount) {
            withdrawAmount.addEventListener('input', this.updateWithdrawalSummary.bind(this));
        }
    }

    hideLoadingScreen() {
        const loading = document.getElementById('loading');
        const mainApp = document.getElementById('main-app');
        
        setTimeout(() => {
            loading.classList.add('hidden');
            mainApp.classList.remove('hidden');
        }, 2000); // Show loading for 2 seconds for effect
    }

    switchTab(tabName) {
        // Update navigation
        const navTabs = document.querySelectorAll('.nav-tab');
        navTabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-tab') === tabName) {
                tab.classList.add('active');
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
                case 'dashboard':
                    await this.loadDashboardData();
                    break;
                case 'deposit':
                    await this.loadDepositData();
                    break;
                case 'withdraw':
                    await this.loadWithdrawData();
                    break;
                case 'history':
                    await this.loadHistoryData();
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${tabName} data:`, error);
        }
    }

    async loadDashboardData() {
        try {
            const dashboard = await api.getUserDashboard(this.telegramUser.id);
            this.updateBalanceDisplay(dashboard.balance);
            this.updateRecentActivity(dashboard.recent_transactions, dashboard.recent_accruals, dashboard.recent_withdrawals);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    async loadDepositData() {
        try {
            const depositInfo = await api.getDepositInfo();
            this.updateDepositInfo(depositInfo);
        } catch (error) {
            console.error('Error loading deposit info:', error);
        }
    }

    async loadWithdrawData() {
        try {
            const balance = await api.getUserBalance(this.telegramUser.id);
            this.updateAvailableBalance(balance.total_balance);
        } catch (error) {
            console.error('Error loading withdrawal data:', error);
        }
    }

    async loadHistoryData() {
        try {
            const [deposits, withdrawals] = await Promise.all([
                api.getUserDeposits(this.telegramUser.id),
                api.getUserWithdrawals(this.telegramUser.id)
            ]);
            
            this.updateHistoryDisplay([...deposits, ...withdrawals]);
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }

    updateBalanceDisplay(balance) {
        this.currentBalance = balance;
        
        document.getElementById('totalBalance').textContent = parseFloat(balance.total_balance).toFixed(2);
        document.getElementById('approvedDeposits').textContent = `${parseFloat(balance.approved_deposits).toFixed(2)} USDT`;
        document.getElementById('totalAccruals').textContent = `${parseFloat(balance.total_accruals).toFixed(2)} USDT`;
        document.getElementById('pendingDeposits').textContent = `${parseFloat(balance.pending_deposits).toFixed(2)} USDT`;
    }

    updateDepositInfo(depositInfo) {
        const depositAddress = document.getElementById('depositAddress');
        const qrCode = document.getElementById('qrCode');
        
        if (depositAddress) {
            depositAddress.value = depositInfo.address;
        }
        
        if (qrCode && depositInfo.qr_code) {
            qrCode.innerHTML = `<img src="${depositInfo.qr_code}" alt="QR Code" style="width: 100%; height: 100%; object-fit: contain;">`;
        }
    }

    updateAvailableBalance(balance) {
        const availableBalance = document.getElementById('availableBalance');
        if (availableBalance) {
            availableBalance.textContent = `${parseFloat(balance).toFixed(2)} USDT`;
        }
    }

    updateRecentActivity(deposits, accruals, withdrawals) {
        const recentActivity = document.getElementById('recentActivity');
        if (!recentActivity) return;

        // Combine and sort by date
        const allActivities = [
            ...deposits.map(d => ({...d, type: 'deposit'})),
            ...accruals.map(a => ({...a, type: 'accrual'})),
            ...withdrawals.map(w => ({...w, type: 'withdrawal'}))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

        const html = allActivities.map(activity => {
            const icon = this.getActivityIcon(activity.type);
            const title = this.getActivityTitle(activity.type, activity);
            const amount = `${parseFloat(activity.amount).toFixed(2)} USDT`;
            const date = new Date(activity.created_at).toLocaleDateString();

            return `
                <div class="activity-item">
                    <div class="activity-icon ${activity.type}">${icon}</div>
                    <div class="activity-details">
                        <div class="activity-title">${title}</div>
                        <div class="activity-subtitle">${date}</div>
                    </div>
                    <div class="activity-amount">${amount}</div>
                </div>
            `;
        }).join('');

        recentActivity.innerHTML = html || '<p style="text-align: center; color: #888;">No recent activity</p>';
    }

    updateHistoryDisplay(transactions) {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;

        const html = transactions.map(tx => {
            const type = tx.tx_hash ? 'deposit' : (tx.to_address ? 'withdrawal' : 'accrual');
            const status = tx.status || 'completed';
            const amount = `${parseFloat(tx.amount).toFixed(2)} USDT`;
            const date = new Date(tx.created_at).toLocaleDateString();

            return `
                <div class="history-item" data-type="${type}">
                    <div class="history-item-header">
                        <div class="transaction-type">
                            ${this.getActivityIcon(type)}
                            ${this.getActivityTitle(type, tx)}
                        </div>
                        <div class="transaction-amount">${amount}</div>
                    </div>
                    <div class="transaction-details">
                        <span class="transaction-status status-${status}">${status}</span>
                        <span class="transaction-date">${date}</span>
                    </div>
                </div>
            `;
        }).join('');

        historyList.innerHTML = html || '<p style="text-align: center; color: #888;">No transactions found</p>';
    }

    getActivityIcon(type) {
        const icons = {
            deposit: '💳',
            withdrawal: '💸',
            accrual: '🎯'
        };
        return icons[type] || '📊';
    }

    getActivityTitle(type, activity) {
        const titles = {
            deposit: 'Deposit',
            withdrawal: 'Withdrawal',
            accrual: 'Earnings'
        };
        return titles[type] || 'Transaction';
    }

    async handleDepositSubmit(e) {
        e.preventDefault();
        
        const txHash = document.getElementById('txHash').value.trim();
        const comment = document.getElementById('comment').value.trim();

        if (!txHash) {
            this.showError('Please enter transaction hash');
            return;
        }

        try {
            const depositData = {
                tx_hash: txHash,
                comment: comment || null
            };

            await api.createDeposit(this.telegramUser.id, depositData);
            this.showSuccess(getText('deposit_success'));
            
            // Add notification
            if (notificationManager) {
                notificationManager.addNotification('deposit', 'Deposit request submitted. Waiting for confirmation...');
            }
            
            // Reset form
            document.getElementById('depositForm').reset();
            
            // Refresh data
            await this.loadDashboardData();
            
        } catch (error) {
            this.showError(error.message);
        }
    }

    async handleWithdrawalSubmit(e) {
        e.preventDefault();
        
        const amount = parseFloat(document.getElementById('withdrawAmount').value);
        const address = document.getElementById('withdrawAddress').value.trim();
        const type = document.querySelector('input[name="withdrawalType"]:checked').value;

        if (!amount || amount <= 0) {
            this.showError(getText('invalid_amount'));
            return;
        }

        if (!address) {
            this.showError(getText('invalid_address'));
            return;
        }

        if (this.currentBalance && amount > parseFloat(this.currentBalance.total_balance)) {
            this.showError(getText('insufficient_balance'));
            return;
        }

        try {
            const withdrawalData = {
                amount: amount,
                to_address: address,
                withdrawal_type: type
            };

            await api.createWithdrawal(this.telegramUser.id, withdrawalData);
            this.showSuccess(getText('withdrawal_success'));
            
            // Add notification
            if (notificationManager) {
                notificationManager.addNotification('withdrawal', 'Withdrawal request submitted. Processing...');
            }
            
            // Reset form
            document.getElementById('withdrawForm').reset();
            
            // Refresh data
            await this.loadDashboardData();
            
        } catch (error) {
            this.showError(error.message);
        }
    }

    updateWithdrawalSummary() {
        const amount = document.getElementById('withdrawAmount').value;
        const summaryAmount = document.getElementById('summaryAmount');
        
        if (summaryAmount) {
            summaryAmount.textContent = `${parseFloat(amount || 0).toFixed(2)} USDT`;
        }
    }

    async refreshBalance() {
        const refreshIcon = document.querySelector('.refresh-icon');
        if (refreshIcon) {
            refreshIcon.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                refreshIcon.style.transform = 'rotate(0deg)';
            }, 500);
        }

        await this.loadDashboardData();
    }

    showLanguageMenu() {
        // Simple language menu - in a real app you might want a proper modal
        const languages = [
            { code: 'en', name: '🇺🇸 English' },
            { code: 'ru', name: '🇷🇺 Русский' },
            { code: 'zh', name: '🇨🇳 中文' }
        ];

        const currentLang = getCurrentLanguage();
        const nextLangIndex = (languages.findIndex(l => l.code === currentLang) + 1) % languages.length;
        const nextLang = languages[nextLangIndex];

        setLanguage(nextLang.code);
    }

    filterHistory() {
        const filter = document.getElementById('historyFilter').value;
        const historyItems = document.querySelectorAll('.history-item');

        historyItems.forEach(item => {
            const type = item.getAttribute('data-type');
            if (filter === 'all' || filter === type) {
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

// Utility functions
function switchTab(tabName) {
    if (window.app) {
        window.app.switchTab(tabName);
    }
}

function copyAddress() {
    const addressInput = document.getElementById('depositAddress');
    if (addressInput) {
        addressInput.select();
        document.execCommand('copy');
        
        // Show feedback
        const copyBtn = document.querySelector('.copy-btn');
        if (copyBtn) {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = getText('copied');
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }
    }
}

function setMaxAmount() {
    const maxBtn = document.querySelector('.max-btn');
    const amountInput = document.getElementById('withdrawAmount');
    const availableBalance = document.getElementById('availableBalance');
    
    if (amountInput && availableBalance) {
        const balance = parseFloat(availableBalance.textContent.replace(' USDT', ''));
        amountInput.value = balance.toFixed(2);
        
        // Trigger input event to update summary
        amountInput.dispatchEvent(new Event('input'));
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TronStakingApp();
    
    // Initialize notification system
    initNotifications();
    
    // Start earnings animation on dashboard
    setTimeout(() => {
        initEarningsAnimation();
    }, 1000);
});

// Global functions for window
window.switchTab = switchTab;
window.copyAddress = copyAddress;
window.setMaxAmount = setMaxAmount;

// Notification System
class NotificationManager {
    constructor() {
        this.userId = this.getUserId();
        this.notifications = this.loadNotifications();
        this.init();
    }

    getUserId() {
        // Try to get user ID from Telegram WebApp
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
            const initData = window.Telegram.WebApp.initDataUnsafe;
            if (initData.user && initData.user.id) {
                return `telegram_${initData.user.id}`;
            }
        }
        // Fallback to session storage or generate temporary ID
        let sessionId = sessionStorage.getItem('sessionId');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('sessionId', sessionId);
        }
        return sessionId;
    }

    init() {
        this.updateBadge();
        this.renderNotifications();
    }

    loadNotifications() {
        const key = `notifications_${this.userId}`;
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : [];
    }

    saveNotifications() {
        const key = `notifications_${this.userId}`;
        localStorage.setItem(key, JSON.stringify(this.notifications));
    }

    addNotification(type, message, data = {}) {
        const notification = {
            id: Date.now(),
            type: type,
            message: message,
            data: data,
            timestamp: new Date(),
            read: false
        };
        
        this.notifications.unshift(notification);
        
        // Keep only last 50 notifications
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }
        
        this.saveNotifications();
        this.updateBadge();
        this.renderNotifications();
    }

    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.saveNotifications();
            this.updateBadge();
            this.renderNotifications();
        }
    }

    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.saveNotifications();
        this.updateBadge();
        this.renderNotifications();
    }

    updateBadge() {
        const badge = document.getElementById('notificationCount');
        const unreadCount = this.notifications.filter(n => !n.read).length;
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    renderNotifications() {
        const modalBody = document.getElementById('notificationModalBody');
        if (!modalBody) return;

        if (this.notifications.length === 0) {
            modalBody.innerHTML = '<div class="notification-modal-empty">No notifications</div>';
            return;
        }

        modalBody.innerHTML = this.notifications.map(notification => `
            <div class="notification-modal-item ${notification.read ? '' : 'unread'}" 
                 onclick="notificationManager.markAsRead(${notification.id})">
                <div class="notification-modal-text">${notification.message}</div>
                <div class="notification-modal-time">${this.formatTime(notification.timestamp)}</div>
            </div>
        `).join('');
    }

    formatTime(timestamp) {
        const now = new Date();
        const diff = now - new Date(timestamp);
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }
}

// Global notification manager
let notificationManager;

// Initialize notification system
function initNotifications() {
    notificationManager = new NotificationManager();
    
    // Don't add demo notifications - let users see real notifications only
    // Demo notifications were causing confusion across different accounts
}

// Toggle notifications modal
function toggleNotifications() {
    const modal = document.getElementById('notificationsModal');
    if (!modal) return;

    if (modal.classList.contains('show')) {
        closeNotifications();
    } else {
        openNotifications();
    }
}

// Open notifications modal
function openNotifications() {
    const modal = document.getElementById('notificationsModal');
    if (!modal || !notificationManager) return;

    notificationManager.renderNotifications();
    modal.classList.add('show');
    
    // Close modal when clicking outside
    modal.onclick = function(e) {
        if (e.target === modal) {
            closeNotifications();
        }
    };
}

// Close notifications modal
function closeNotifications() {
    const modal = document.getElementById('notificationsModal');
    if (!modal) return;
    
    modal.classList.remove('show');
}

// Mark all notifications as read
function markAllAsRead() {
    if (!notificationManager) return;
    
    notificationManager.markAllAsRead();
    notificationManager.renderNotifications();
}

// Earnings Overview Animation Functions
function initEarningsAnimation() {
    if (!window.app) return;
    
    // Load saved stats from localStorage
    const savedStats = localStorage.getItem('tradingStats');
    if (savedStats) {
        window.app.tradingStats = JSON.parse(savedStats);
    } else {
        window.app.tradingStats = {
            totalPools: 0,
            totalProfit: 0,
            activePools: 0
        };
    }
    
    // Load saved activities from localStorage
    const savedActivities = localStorage.getItem('tradingActivities');
    if (savedActivities) {
        const activities = JSON.parse(savedActivities);
        const activityList = document.getElementById('tradingActivityList');
        if (activityList) {
            activityList.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <span class="activity-time">${activity.time}</span>
                    <span class="activity-pool">${activity.poolId}</span>
                    <span class="activity-profit">+${activity.profit}%</span>
                </div>
            `).join('');
        }
    }
    
    startTradingAnimation();
}

function startTradingAnimation() {
    const activityList = document.getElementById('tradingActivityList');
    if (!activityList) return;

    // Generate random pool ID
    const generatePoolId = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 7; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    // Generate random profit percentage
    const generateProfit = () => {
        return (Math.random() * 3 + 2).toFixed(3); // 2.000% to 5.000%
    };

        // Add new trading activity
        const addTradingActivity = () => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
            });
            
            const poolId = generatePoolId();
            const profit = generateProfit();
            
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <span class="activity-time">${timeStr}</span>
                <span class="activity-pool">${poolId}</span>
                <span class="activity-profit">+${profit}%</span>
            `;
            
            // Insert at the top
            activityList.insertBefore(activityItem, activityList.firstChild);
            
            // Keep only last 10 items
            while (activityList.children.length > 10) {
                activityList.removeChild(activityList.lastChild);
            }
            
            // Save activities to localStorage
            const activities = Array.from(activityList.children).map(item => ({
                time: item.querySelector('.activity-time').textContent,
                poolId: item.querySelector('.activity-pool').textContent,
                profit: item.querySelector('.activity-profit').textContent.replace('+', '').replace('%', '')
            }));
            localStorage.setItem('tradingActivities', JSON.stringify(activities));
            
            // Update stats
            if (window.app.tradingStats) {
                window.app.tradingStats.totalPools++;
                window.app.tradingStats.totalProfit += parseFloat(profit);
                window.app.tradingStats.activePools = Math.min(window.app.tradingStats.activePools + 1, 15);
                
                // Save stats to localStorage
                localStorage.setItem('tradingStats', JSON.stringify(window.app.tradingStats));
                
                updateTradingStats();
            }
        };

    // Update trading statistics
    window.updateTradingStats = () => {
        if (!window.app.tradingStats) return;
        
        const totalPoolsEl = document.getElementById('totalPools');
        const avgProfitEl = document.getElementById('avgProfit');
        const activePoolsEl = document.getElementById('activePools');
        
        if (totalPoolsEl) {
            totalPoolsEl.textContent = window.app.tradingStats.totalPools;
        }
        
        if (avgProfitEl) {
            const avgProfit = window.app.tradingStats.totalPools > 0 
                ? (window.app.tradingStats.totalProfit / window.app.tradingStats.totalPools).toFixed(1)
                : '0';
            avgProfitEl.textContent = `${avgProfit}%`;
        }
        
        if (activePoolsEl) {
            activePoolsEl.textContent = window.app.tradingStats.activePools;
        }
    };

    // Start the animation
    addTradingActivity(); // Initial activity
    window.tradingInterval = setInterval(addTradingActivity, Math.random() * 3000 + 2000); // 2-5 seconds
}

function stopTradingAnimation() {
    if (window.tradingInterval) {
        clearInterval(window.tradingInterval);
        window.tradingInterval = null;
    }
}

// Override switchTab to handle earnings animation
const originalSwitchTab = window.switchTab;
window.switchTab = function(tabName) {
    originalSwitchTab(tabName);
    
    // Handle earnings animation
    if (tabName === 'dashboard') {
        initEarningsAnimation();
    } else {
        stopTradingAnimation();
    }
};