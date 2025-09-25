class AdminAPI {
    constructor() {
        this.baseURL = '/api/admin';
        this.token = localStorage.getItem('admin_token');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add auth token if available
        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired or invalid
                    this.logout();
                    throw new Error('Authentication required');
                }
                throw new Error(data.detail || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('Admin API Error:', error);
            throw error;
        }
    }

    // Authentication
    async login(username, password) {
        try {
            const response = await this.request('/login', {
                method: 'POST',
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            this.token = response.access_token;
            localStorage.setItem('admin_token', this.token);
            return response;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    logout() {
        this.token = null;
        localStorage.removeItem('admin_token');
        window.location.reload();
    }

    isAuthenticated() {
        return !!this.token;
    }

    // Statistics
    async getStats() {
        return await this.request('/stats');
    }

    // Deposits
    async getPendingDeposits(skip = 0, limit = 100) {
        return await this.request(`/deposits/pending?skip=${skip}&limit=${limit}`);
    }

    async getAllDeposits(skip = 0, limit = 100) {
        return await this.request(`/deposits?skip=${skip}&limit=${limit}`);
    }

    async updateDeposit(depositId, updateData) {
        return await this.request(`/deposits/${depositId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
    }

    async getDeposit(depositId) {
        return await this.request(`/deposits/${depositId}`);
    }

    async setDepositAmount(depositId, amount) {
        return await this.request(`/deposits/${depositId}/amount`, {
            method: 'PATCH',
            body: JSON.stringify({ amount })
        });
    }

    // Withdrawals
    async getPendingWithdrawals(skip = 0, limit = 100) {
        return await this.request(`/withdrawals/pending?skip=${skip}&limit=${limit}`);
    }

    async getAllWithdrawals(skip = 0, limit = 100) {
        return await this.request(`/withdrawals?skip=${skip}&limit=${limit}`);
    }

    async updateWithdrawal(withdrawalId, updateData) {
        return await this.request(`/withdrawals/${withdrawalId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
    }

    async getWithdrawal(withdrawalId) {
        return await this.request(`/withdrawals/${withdrawalId}`);
    }

    // Accruals
    async createAccrual(accrualData) {
        return await this.request('/accruals', {
            method: 'POST',
            body: JSON.stringify(accrualData)
        });
    }

    async getRecentAccruals(skip = 0, limit = 100) {
        return await this.request(`/accruals?skip=${skip}&limit=${limit}`);
    }

    async createBulkAccrual(percentage, description) {
        return await this.request('/accruals/bulk', {
            method: 'POST',
            body: JSON.stringify({
                percentage: percentage,
                description: description
            })
        });
    }

    // Users
    async getUsers(skip = 0, limit = 100, search = '') {
        let url = `/users?skip=${skip}&limit=${limit}`;
        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }
        return await this.request(url);
    }

    async getUserBalance(userId) {
        return await this.request(`/users/${userId}/balance`);
    }

    async getUser(userId) {
        return await this.request(`/users/${userId}`);
    }

    async getUserBalance(userId) {
        return await this.request(`/users/${userId}/balance`);
    }
}

// Create global admin API instance
const adminApi = new AdminAPI();
