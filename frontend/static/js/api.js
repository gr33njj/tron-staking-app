class API {
    constructor() {
        this.baseURL = '/api';
        this.currentUser = null;
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

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Authentication
    async authenticateUser(telegramData) {
        try {
            const user = await this.request('/auth/telegram', {
                method: 'POST',
                body: JSON.stringify(telegramData)
            });
            
            this.currentUser = user;
            return user;
        } catch (error) {
            console.error('Authentication failed:', error);
            throw error;
        }
    }

    // User data
    async getUserBalance(telegramId) {
        return await this.request(`/user/${telegramId}/balance`);
    }

    async getUserDashboard(telegramId) {
        return await this.request(`/user/${telegramId}/dashboard`);
    }

    async getUserDeposits(telegramId, skip = 0, limit = 100) {
        return await this.request(`/user/${telegramId}/deposits?skip=${skip}&limit=${limit}`);
    }

    async getUserWithdrawals(telegramId, skip = 0, limit = 100) {
        return await this.request(`/user/${telegramId}/withdrawals?skip=${skip}&limit=${limit}`);
    }

    // Deposits
    async createDeposit(telegramId, depositData) {
        return await this.request(`/user/${telegramId}/deposit`, {
            method: 'POST',
            body: JSON.stringify(depositData)
        });
    }

    async getDepositInfo() {
        return await this.request('/deposit-info');
    }

    // Withdrawals
    async createWithdrawal(telegramId, withdrawalData) {
        return await this.request(`/user/${telegramId}/withdraw`, {
            method: 'POST',
            body: JSON.stringify(withdrawalData)
        });
    }
}

// Create global API instance
const api = new API();




