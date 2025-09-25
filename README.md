# 🚀 TRON Staking Platform

Полнофункциональная платформа для управления депозитами USDT TRC-20 с Telegram WebApp, ботом и админ-панелью.

## 📋 Возможности

### Для пользователей:
- 💳 **Депозиты USDT TRC-20** - пополнение через единый адрес
- 📊 **Отслеживание баланса** - в реальном времени
- 🎯 **Начисления прибыли** - автоматическое отображение
- 💸 **Заявки на вывод** - обычный и досрочный
- 📱 **Telegram WebApp** - удобный интерфейс
- 🌐 **Мультиязычность** - английский, русский, китайский

### Для администраторов:
- 🔍 **Мониторинг транзакций** - автоматическая проверка
- ✅ **Управление депозитами** - одобрение/отклонение
- 💰 **Обработка выводов** - контроль выплат
- 📈 **Начисления прибыли** - индивидуальные и массовые
- 📊 **Статистика** - полная аналитика платформы
- 🔐 **Безопасность** - защищенная админ-панель

## 🏗️ Архитектура

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Telegram Bot  │────│   FastAPI        │────│   PostgreSQL    │
│                 │    │   Backend        │    │   Database      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Telegram WebApp│    │   Admin Panel    │    │     Redis       │
│                 │    │                  │    │    Cache        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                ┌──────────────────┐    ┌─────────────────┐
                │   TRON Monitor   │────│  TronGrid API   │
                │    Service       │    │                 │
                └──────────────────┘    └─────────────────┘
```

## 🛠️ Технологии

### Backend:
- **FastAPI** - современный Python веб-фреймворк
- **PostgreSQL** - основная база данных
- **Redis** - кэширование и сессии
- **SQLAlchemy** - ORM для работы с БД
- **Alembic** - миграции базы данных

### Frontend:
- **Vanilla JavaScript** - WebApp интерфейс
- **CSS3** - футуристический дизайн
- **Telegram WebApp API** - интеграция с Telegram

### Blockchain:
- **TronPy** - работа с TRON блокчейном
- **TronGrid API** - мониторинг транзакций

### Развертывание:
- **Docker** - контейнеризация
- **Docker Compose** - оркестрация
- **Nginx** - обратный прокси
- **Ubuntu 24.04** - операционная система

## 📦 Установка и развертывание

### Быстрая установка

1. **Клонируйте репозиторий:**
```bash
git clone <repository-url>
cd tron-staking-app
```

2. **Настройте окружение:**
```bash
cp env.example .env
# Отредактируйте .env файл с вашими настройками
```

3. **Запустите автоматическое развертывание:**
```bash
chmod +x deploy.sh
./deploy.sh
```

### Ручная установка

#### Требования:
- Ubuntu 24.04 LTS
- Docker и Docker Compose
- Python 3.11+
- PostgreSQL 15+
- Redis 7+

#### Шаг 1: Установка зависимостей

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Шаг 2: Конфигурация

```bash
# Создание .env файла
cp env.example .env

# Обязательные настройки в .env:
TELEGRAM_BOT_TOKEN=ваш_токен_бота
TRON_API_KEY=ваш_ключ_trongrid
DEPOSIT_ADDRESS=адрес_для_депозитов
HOT_WALLET_PRIVATE_KEY=приватный_ключ_горячего_кошелька
SECRET_KEY=секретный_ключ_приложения
ADMIN_PASSWORD=пароль_администратора
```

#### Шаг 3: Запуск

```bash
# Сборка и запуск контейнеров
docker-compose build
docker-compose up -d

# Применение миграций БД
docker-compose exec backend alembic upgrade head

# Создание администратора
docker-compose exec backend python -c "
from backend.database import SessionLocal
from backend import crud
from backend.config import settings
db = SessionLocal()
crud.create_admin_user(db, 'admin', settings.admin_password)
db.close()
"
```

## ⚙️ Конфигурация

### Основные параметры (.env файл):

```bash
# База данных
DATABASE_URL=postgresql://postgres:password@localhost:5432/tron_staking
REDIS_URL=redis://localhost:6379

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_API_ID=your_api_id_here
TELEGRAM_API_HASH=your_api_hash_here
WEBAPP_URL=https://obtain-api.online
ADMIN_WEBAPP_URL=https://admin.obtain-api.online

# TRON Network
TRON_API_KEY=your_tron_api_key
TRON_NETWORK=mainnet
DEPOSIT_ADDRESS=your_trc20_deposit_address
HOT_WALLET_PRIVATE_KEY=your_hot_wallet_private_key

# Безопасность
SECRET_KEY=your_secret_key_here
ADMIN_PASSWORD=your_admin_password_here

# Сервер
HOST=188.225.25.31
PORT=8000
DEBUG=false

# Домены
DOMAIN=obtain-api.online
ADMIN_DOMAIN=admin.obtain-api.online
```

### Настройка Telegram бота:

1. Создайте бота через @BotFather
2. Получите токен и добавьте в .env
3. Настройте WebApp URL в боте:
```
/setmenubutton
@your_bot_name
🌐 Open App
https://example.com
```

### Настройка TRON API:

1. Зарегистрируйтесь на [TronGrid](https://www.trongrid.io/)
2. Получите API ключ
3. Добавьте в .env файл

## 🔧 Управление

### Запуск и остановка:

```bash
# Запуск всех сервисов
docker-compose up -d

# Остановка
docker-compose down

# Перезапуск
docker-compose restart

# Просмотр логов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f bot
docker-compose logs -f monitor
```

### Управление через systemd:

```bash
# Запуск
sudo systemctl start tron-staking

# Остановка
sudo systemctl stop tron-staking

# Перезапуск
sudo systemctl restart tron-staking

# Статус
sudo systemctl status tron-staking
```

### Мониторинг:

```bash
# Состояние контейнеров
docker-compose ps

# Использование ресурсов
docker stats

# Проверка API
curl http://localhost:8000/api/deposit-info

# Проверка здоровья
curl http://localhost:8000/health
```

## 📊 API Документация

### Пользовательские endpoints:

```
GET  /api/user/{telegram_id}/balance     - Получить баланс
GET  /api/user/{telegram_id}/dashboard   - Данные дашборда
POST /api/user/{telegram_id}/deposit     - Создать депозит
POST /api/user/{telegram_id}/withdraw    - Запрос на вывод
GET  /api/deposit-info                   - Информация для депозита
```

### Административные endpoints:

```
POST /api/admin/login                    - Вход админа
GET  /api/admin/stats                    - Статистика
GET  /api/admin/deposits/pending         - Ожидающие депозиты
PUT  /api/admin/deposits/{id}            - Обновить депозит
GET  /api/admin/withdrawals/pending      - Ожидающие выводы
PUT  /api/admin/withdrawals/{id}         - Обновить вывод
POST /api/admin/accruals                 - Создать начисление
POST /api/admin/accruals/bulk            - Массовые начисления
```

Полная документация доступна по адресу: `http://your-server:8000/docs`

## 🔐 Безопасность

### Меры безопасности:

1. **Аутентификация** - JWT токены для админов
2. **Валидация** - проверка всех Telegram данных
3. **Шифрование** - bcrypt для паролей
4. **Rate Limiting** - ограничение запросов
5. **CORS** - настроенные политики
6. **Firewall** - UFW с ограниченными портами

### Рекомендации:

- Используйте сильные пароли
- Включите 2FA где возможно
- Регулярно обновляйте зависимости
- Мониторьте логи безопасности
- Используйте SSL сертификаты

## 🌐 SSL и HTTPS

### Настройка SSL с Let's Encrypt:

```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx

# Получение сертификатов
sudo certbot --nginx -d obtain-api.online -d admin.obtain-api.online

# Автоматическое обновление
sudo crontab -e
# Добавьте: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Настройка в nginx.conf:
Раскомментируйте секции HTTPS в `nginx.conf` после получения сертификатов.

## 📝 Логирование

### Расположение логов:

```
/var/log/tron-staking/           - Логи приложения
/var/log/nginx/                  - Логи Nginx
docker-compose logs              - Логи контейнеров
```

### Просмотр логов:

```bash
# Логи приложения
tail -f /var/log/tron-staking/app.log

# Логи мониторинга TRON
tail -f /var/log/tron-staking/monitor.log

# Логи бота
docker-compose logs -f bot

# Логи веб-сервера
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 🔄 Backup и восстановление

### Backup базы данных:

```bash
# Создание backup
docker-compose exec postgres pg_dump -U postgres tron_staking > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановление
docker-compose exec -T postgres psql -U postgres tron_staking < backup_file.sql
```

### Backup конфигурации:

```bash
# Сохранение важных файлов
tar -czf config_backup.tar.gz .env docker-compose.yml nginx.conf
```

## 🔧 Troubleshooting

### Частые проблемы:

1. **Контейнер не запускается:**
```bash
docker-compose logs service_name
# Проверьте .env файл
# Убедитесь в правильности портов
```

2. **База данных недоступна:**
```bash
docker-compose exec postgres psql -U postgres -c "\l"
# Проверьте статус PostgreSQL
# Проверьте строку подключения
```

3. **API не отвечает:**
```bash
curl -v http://localhost:8000/health
# Проверьте логи backend
# Убедитесь в работе миграций
```

4. **Telegram бот не работает:**
```bash
# Проверьте токен бота
# Убедитесь в доступности API Telegram
# Проверьте webhook URL
```

### Диагностика:

```bash
# Проверка состояния всех сервисов
docker-compose ps

# Проверка использования ресурсов
docker stats

# Проверка сети
docker network ls
docker network inspect tron-staking_tron-network

# Проверка volumes
docker volume ls
```

## 🙏 Благодарности

- TRON Foundation за блокчейн платформу
- Telegram за Bot API и WebApp API
- Сообщество FastAPI за отличный фреймворк

---

**⚡ TRON Staking Platform - Ваш надежный партнер в DeFi инвестициях!**
