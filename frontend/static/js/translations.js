const translations = {
    en: {
        // Navigation
        dashboard: "Dashboard",
        deposit: "Deposit",
        withdraw: "Withdraw", 
        history: "History",
        how_it_works: "How it works",
        language: "EN",
        
        // Dashboard
        total_balance: "Total Balance",
        approved_deposits: "Approved Deposits",
        total_accruals: "Total Accruals",
        pending_deposits: "Pending Deposits",
        recent_activity: "Recent Activity",
        earnings_overview: "Earnings Overview",
        make_deposit: "Make Deposit",
        request_withdrawal: "Request Withdrawal",
        
        // Deposit
        deposit_usdt: "Deposit USDT",
        deposit_description: "Send USDT TRC-20 to start earning",
        scan_qr: "Scan QR code or copy address",
        deposit_address: "Deposit Address (TRC-20)",
        copy: "Copy",
        network: "Network",
        token: "Token",
        min_confirmations: "Min Confirmations",
        submit_transaction: "Submit Transaction",
        transaction_hash: "Transaction Hash",
        comment_optional: "Comment (Optional)",
        submit_deposit: "Submit Deposit",
        
        // Withdraw
        request_withdrawal: "Request Withdrawal",
        withdraw_description: "Withdraw your earnings to your wallet",
        available_balance: "Available Balance",
        withdrawal_amount: "Withdrawal Amount",
        max: "MAX",
        withdrawal_address: "Withdrawal Address",
        address_warning: "⚠️ Make sure the address is correct. Transactions cannot be reversed.",
        withdrawal_type: "Withdrawal Type",
        regular_withdrawal: "Regular Withdrawal",
        early_withdrawal: "Early Withdrawal",
        network_fee: "Network Fee",
        submit_withdrawal: "Submit Withdrawal Request",
        
        // History
        transaction_history: "Transaction History",
        all_transactions: "All Transactions",
        deposits: "Deposits",
        withdrawals: "Withdrawals",
        accruals: "Accruals",
        
        // General
        success: "Success!",
        error: "Error",
        loading: "Loading...",
        copied: "Copied to clipboard!",
        
        // Messages
        deposit_success: "Deposit request submitted successfully!",
        withdrawal_success: "Withdrawal request submitted successfully!",
        invalid_address: "Invalid TRON address",
        insufficient_balance: "Insufficient balance",
        invalid_amount: "Invalid amount"
        ,
        how_title: "How it works",
        how_step_1: "You deposit USDT here.",
        how_step_2: "Funds go to a liquid pool of margin requests on T2/T3 exchanges.",
        how_step_3: "They are rented by users for a fee, and profit is distributed when the pool is fully utilized (avg 2–5% weekly).",
        how_step_4: "Plan your withdrawals so you receive funds right after distribution.",
        
        // Earnings Overview
        earnings_overview: "Earnings Overview",
        earnings_title: "Live Trading Activity",
        live_status: "Live",
        time: "Time",
        pool_id: "Pool ID",
        profit: "Profit",
        total_pools: "Total Pools",
        avg_profit: "Avg Profit",
        active_pools: "Active Pools"
        ,
        mark_all_read: "Mark All as Read"
    },
    
    ru: {
        // Navigation
        dashboard: "Дашборд",
        deposit: "Депозит",
        withdraw: "Вывод",
        history: "История",
        how_it_works: "Как это работает",
        language: "RU",
        
        // Dashboard
        total_balance: "Общий баланс",
        approved_deposits: "Подтвержденные депозиты",
        total_accruals: "Общие начисления",
        pending_deposits: "Ожидающие депозиты",
        recent_activity: "Последняя активность",
        earnings_overview: "Обзор доходов",
        make_deposit: "Сделать депозит",
        request_withdrawal: "Запросить вывод",
        
        // Deposit
        deposit_usdt: "Депозит USDT",
        deposit_description: "Отправьте USDT TRC-20 для начала заработка",
        scan_qr: "Отсканируйте QR код или скопируйте адрес",
        deposit_address: "Адрес депозита (TRC-20)",
        copy: "Копировать",
        network: "Сеть",
        token: "Токен",
        min_confirmations: "Мин. подтверждений",
        submit_transaction: "Отправить транзакцию",
        transaction_hash: "Хеш транзакции",
        comment_optional: "Комментарий (необязательно)",
        submit_deposit: "Отправить депозит",
        
        // Withdraw
        request_withdrawal: "Запрос на вывод",
        withdraw_description: "Выведите ваши доходы на кошелек",
        available_balance: "Доступный баланс",
        withdrawal_amount: "Сумма вывода",
        max: "МАКС",
        withdrawal_address: "Адрес для вывода",
        address_warning: "⚠️ Убедитесь, что адрес правильный. Транзакции нельзя отменить.",
        withdrawal_type: "Тип вывода",
        regular_withdrawal: "Обычный вывод",
        early_withdrawal: "Досрочный вывод",
        network_fee: "Комиссия сети",
        submit_withdrawal: "Отправить запрос на вывод",
        
        // History
        transaction_history: "История транзакций",
        all_transactions: "Все транзакции",
        deposits: "Депозиты",
        withdrawals: "Выводы",
        accruals: "Начисления",
        
        // General
        success: "Успех!",
        error: "Ошибка",
        loading: "Загрузка...",
        copied: "Скопировано в буфер обмена!",
        
        // Messages
        deposit_success: "Запрос на депозит успешно отправлен!",
        withdrawal_success: "Запрос на вывод успешно отправлен!",
        invalid_address: "Неверный адрес TRON",
        insufficient_balance: "Недостаточно средств",
        invalid_amount: "Неверная сумма",
        how_title: "Как это работает",
        how_step_1: "Вы вносите USDT сюда.",
        how_step_2: "Средства идут в ликвидный пул маржинальных заявок на T2/T3 биржах.",
        how_step_3: "Они арендуются пользователями за комиссию; при полной загрузке пула прибыль распределяется участникам (в среднем 2–5% в неделю).",
        how_step_4: "Планируйте выводы, чтобы после распределения сразу получить средства на кошелёк.",
        
        // Earnings Overview
        earnings_overview: "Обзор доходов",
        earnings_title: "Активность торговли в реальном времени",
        live_status: "В эфире",
        time: "Время",
        pool_id: "ID пула",
        profit: "Прибыль",
        total_pools: "Всего пулов",
        avg_profit: "Средняя прибыль",
        active_pools: "Активные пулы"
        ,
        mark_all_read: "Отметить все как прочитанные"
    },
    
    zh: {
        // Navigation
        dashboard: "仪表板",
        deposit: "存款",
        withdraw: "提取",
        history: "历史",
        how_it_works: "原理说明",
        language: "ZH",
        
        // Dashboard
        total_balance: "总余额",
        approved_deposits: "已确认存款",
        total_accruals: "总收益",
        pending_deposits: "待处理存款",
        recent_activity: "最近活动",
        earnings_overview: "收益概览",
        make_deposit: "进行存款",
        request_withdrawal: "请求提取",
        
        // Deposit
        deposit_usdt: "存款 USDT",
        deposit_description: "发送 USDT TRC-20 开始赚取收益",
        scan_qr: "扫描二维码或复制地址",
        deposit_address: "存款地址 (TRC-20)",
        copy: "复制",
        network: "网络",
        token: "代币",
        min_confirmations: "最少确认数",
        submit_transaction: "提交交易",
        transaction_hash: "交易哈希",
        comment_optional: "备注（可选）",
        submit_deposit: "提交存款",
        
        // Withdraw
        request_withdrawal: "请求提取",
        withdraw_description: "将您的收益提取到钱包",
        available_balance: "可用余额",
        withdrawal_amount: "提取金额",
        max: "最大",
        withdrawal_address: "提取地址",
        address_warning: "⚠️ 确保地址正确。交易无法撤销。",
        withdrawal_type: "提取类型",
        regular_withdrawal: "常规提取",
        early_withdrawal: "早期提取",
        network_fee: "网络费用",
        submit_withdrawal: "提交提取请求",
        
        // History
        transaction_history: "交易历史",
        all_transactions: "所有交易",
        deposits: "存款",
        withdrawals: "提取",
        accruals: "收益",
        
        // General
        success: "成功！",
        error: "错误",
        loading: "加载中...",
        copied: "已复制到剪贴板！",
        
        // Messages
        deposit_success: "存款请求提交成功！",
        withdrawal_success: "提取请求提交成功！",
        invalid_address: "无效的TRON地址",
        insufficient_balance: "余额不足",
        invalid_amount: "无效金额",
        how_title: "原理说明",
        how_step_1: "在此存入 USDT。",
        how_step_2: "资金进入二级/三级交易所的保证金请求流动池。",
        how_step_3: "用户支付费用租用资金；当资金池被充分利用时，利润按周分配（平均每周 2–5%）。",
        how_step_4: "请提前规划提现，以便在分配后立即收到资金。",
        
        // Earnings Overview
        earnings_overview: "收益概览",
        earnings_title: "实时交易活动",
        live_status: "直播中",
        time: "时间",
        pool_id: "资金池ID",
        profit: "利润",
        total_pools: "总资金池",
        avg_profit: "平均利润",
        active_pools: "活跃资金池"
        ,
        mark_all_read: "全部标记为已读"
    }
};

let currentLanguage = 'en';

function setLanguage(lang) {
    if (translations[lang]) {
        currentLanguage = lang;
        updateUITexts();
        localStorage.setItem('selectedLanguage', lang);
    }
}

function getCurrentLanguage() {
    return currentLanguage;
}

function getText(key) {
    return translations[currentLanguage][key] || translations['en'][key] || key;
}

function updateUITexts() {
    const elements = document.querySelectorAll('[data-key]');
    elements.forEach(element => {
        const key = element.getAttribute('data-key');
        const text = getText(key);
        if (element.tagName === 'INPUT' && element.type === 'submit') {
            element.value = text;
        } else if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
            element.placeholder = text;
        } else {
            element.textContent = text;
        }
    });
    
    // Update language indicator
    const langText = document.querySelector('.lang-text');
    if (langText) {
        langText.textContent = getText('language');
    }
}

function initializeLanguage() {
    // Get language from URL params or localStorage or default to English
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    const savedLang = localStorage.getItem('selectedLanguage');
    
    let lang = 'en';
    if (urlLang && translations[urlLang]) {
        lang = urlLang;
    } else if (savedLang && translations[savedLang]) {
        lang = savedLang;
    }
    
    setLanguage(lang);
}




