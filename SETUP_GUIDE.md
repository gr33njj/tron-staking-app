# 🚀 Пошаговое руководство по установке TRON Staking Platform

Это подробное руководство поможет вам развернуть платформу на сервере Ubuntu 24.04.

## 📋 Предварительные требования

### Сервер:
- **OS**: Ubuntu 24.04 LTS
- **RAM**: минимум 2GB (рекомендуется 4GB)
- **CPU**: минимум 2 ядра
- **Диск**: минимум 20GB SSD
- **IP**: 188.225.25.31 (ваш сервер)

### Домены:
- `obtain-api.online` - основное приложение
- `admin.obtain-api.online` - админ-панель

### Аккаунты:
- Telegram Bot Token
- TronGrid API Key
- TRON кошелек для депозитов

## 🔧 Шаг 1: Подготовка сервера

### 1.1 Подключение к серверу

```bash
ssh root@188.225.25.31
# или
ssh your_user@188.225.25.31
```

### 1.2 Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip htop nano
```

### 1.3 Создание пользователя (если используете root)

```bash
adduser tronuser
usermod -aG sudo tronuser
su - tronuser
```

## 🐳 Шаг 2: Установка Docker

### 2.1 Установка Docker

```bash
# Добавление официального GPG ключа Docker
sudo apt-get update
sudo apt-get install ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Добавление репозитория
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Установка Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER
newgrp docker

# Проверка установки
docker --version
docker compose version
```

### 2.2 Настройка Docker

```bash
# Включение автозапуска
sudo systemctl enable docker
sudo systemctl start docker

# Проверка статуса
sudo systemctl status docker
```

## 📁 Шаг 3: Развертывание приложения

### 3.1 Загрузка кода

```bash
# Создание директории
sudo mkdir -p /opt/tron-staking
sudo chown $USER:$USER /opt/tron-staking
cd /opt/tron-staking

# Загрузка файлов (замените на ваш метод)
# Если у вас есть Git репозиторий:
# git clone https://github.com/your-repo/tron-staking-app.git .

# Или загрузите архив и распакуйте:
# wget https://your-server.com/tron-staking-app.zip
# unzip tron-staking-app.zip
```

### 3.2 Копирование файлов

Если вы развертываете с локальной машины, скопируйте файлы проекта:

```bash
# С локальной машины на сервер:
scp -r /path/to/tron-staking-app/* root@188.225.25.31:/opt/tron-staking/
```

## ⚙️ Шаг 4: Конфигурация

### 4.1 Создание .env файла

```bash
cd /opt/tron-staking
cp env.example .env
nano .env
```

### 4.2 Настройка .env файла

**ВАЖНО**: Обновите следующие значения:

```bash
# База данных
DATABASE_URL=postgresql://postgres:StrongPassword123@postgres:5432/tron_staking
REDIS_URL=redis://redis:6379

# Telegram Bot (ОБЯЗАТЕЛЬНО ОБНОВИТЬ)
TELEGRAM_BOT_TOKEN=8498629566:AAGBT_9LOh1hgrOQLlQ4mkQD0DoXBLGZCmo
TELEGRAM_API_ID=your_api_id_here
TELEGRAM_API_HASH=your_api_hash_here
WEBAPP_URL=https://obtain-api.online
ADMIN_WEBAPP_URL=https://admin.obtain-api.online

# TRON Network (ОБЯЗАТЕЛЬНО ОБНОВИТЬ)
TRON_API_KEY=c0ff307b-d15c-4970-88a6-f2867778b607
TRON_NETWORK=mainnet
DEPOSIT_ADDRESS=TK9MtGPXb3Wjj2ZyfLTexSFYZuLrPMhqdm
HOT_WALLET_PRIVATE_KEY=your_hot_wallet_private_key_here

# Безопасность (ОБЯЗАТЕЛЬНО ОБНОВИТЬ)
SECRET_KEY=your_very_long_secret_key_here_min_32_chars
ADMIN_PASSWORD=YourStrongAdminPassword123

# Сервер
HOST=188.225.25.31
PORT=8000
DEBUG=false

# Домены
DOMAIN=obtain-api.online
ADMIN_DOMAIN=admin.obtain-api.online

# PostgreSQL для docker-compose
POSTGRES_PASSWORD=StrongPassword123
```

### 4.3 Создание директорий

```bash
# Логи
sudo mkdir -p /var/log/tron-staking
sudo chown $USER:$USER /var/log/tron-staking

# SSL (для будущего использования)
sudo mkdir -p /etc/nginx/ssl
sudo chown $USER:$USER /etc/nginx/ssl
```

## 🔥 Шаг 5: Настройка Firewall

```bash
# Включение UFW
sudo ufw --force enable

# Разрешение SSH
sudo ufw allow ssh
sudo ufw allow 22/tcp

# HTTP и HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Для разработки (опционально)
sudo ufw allow 8000/tcp

# Проверка статуса
sudo ufw status
```

## 🚀 Шаг 6: Запуск приложения

### 6.1 Сборка и запуск

```bash
cd /opt/tron-staking

# Сборка контейнеров
docker compose build

# Запуск в фоновом режиме
docker compose up -d

# Проверка статуса
docker compose ps
```

### 6.2 Ожидание запуска

```bash
# Ожидание ~1-2 минуты для полного запуска
sleep 60

# Проверка логов
docker compose logs
```

### 6.3 Применение миграций БД

```bash
# Запуск миграций
docker compose exec backend alembic upgrade head

# Создание начального админа
docker compose exec backend python -c "
import sys
sys.path.append('/app')
from backend.database import SessionLocal
from backend import crud
from backend.config import settings

db = SessionLocal()
try:
    existing_admin = crud.get_admin_by_username(db, 'admin')
    if not existing_admin:
        admin = crud.create_admin_user(db, 'admin', settings.admin_password)
        print('✅ Admin user created successfully')
    else:
        print('ℹ️ Admin user already exists')
except Exception as e:
    print(f'❌ Error: {e}')
finally:
    db.close()
"
```

## 🌐 Шаг 7: Настройка DNS

### 7.1 Настройка A-записей

В вашем DNS провайдере создайте:

```
obtain-api.online      A    188.225.25.31
admin.obtain-api.online A    188.225.25.31
```

### 7.2 Проверка DNS

```bash
# Проверка разрешения DNS
nslookup obtain-api.online
nslookup admin.obtain-api.online

# Или
dig obtain-api.online
dig admin.obtain-api.online
```

## 🤖 Шаг 8: Настройка Telegram бота

### 8.1 Настройка команд бота

Отправьте @BotFather следующие команды:

```
/setcommands
@your_bot_username

start - Запустить бота
balance - Показать баланс
deposit - Информация о депозите
help - Помощь
```

### 8.2 Настройка WebApp кнопки

```
/setmenubutton
@your_bot_username

text: 🌐 Открыть приложение
url: https://obtain-api.online
```

### 8.3 Настройка описания бота

```
/setdescription
@your_bot_username

TRON Staking Platform - Управляйте депозитами USDT TRC-20 и получайте прибыль. Безопасно и надежно.
```

## 🔍 Шаг 9: Тестирование

### 9.1 Проверка API

```bash
# Проверка основного API
curl -v http://188.225.25.31:8000/api/deposit-info

# Или через домен (если DNS настроен)
curl -v http://obtain-api.online/api/deposit-info

# Проверка админ API
curl -v http://admin.obtain-api.online/api/admin/stats
```

### 9.2 Проверка веб-интерфейсов

Откройте в браузере:
- http://obtain-api.online - основное приложение
- http://admin.obtain-api.online - админ-панель

### 9.3 Проверка Telegram бота

1. Найдите вашего бота в Telegram
2. Отправьте команду `/start`
3. Проверьте WebApp кнопку

## 🔐 Шаг 10: SSL сертификаты (опционально)

### 10.1 Установка Certbot

```bash
sudo apt install certbot python3-certbot-nginx
```

### 10.2 Получение сертификатов

```bash
# Остановка Nginx в Docker для получения сертификатов
docker compose stop nginx

# Получение сертификатов
sudo certbot certonly --standalone -d obtain-api.online -d admin.obtain-api.online

# Копирование сертификатов
sudo cp /etc/letsencrypt/live/obtain-api.online/fullchain.pem /etc/nginx/ssl/
sudo cp /etc/letsencrypt/live/obtain-api.online/privkey.pem /etc/nginx/ssl/
sudo chown $USER:$USER /etc/nginx/ssl/*
```

### 10.3 Обновление nginx.conf

Раскомментируйте HTTPS секции в `nginx.conf` и перезапустите:

```bash
nano nginx.conf
# Раскомментируйте HTTPS серверы

docker compose up -d nginx
```

### 10.4 Автоматическое обновление

```bash
# Добавление в crontab
sudo crontab -e

# Добавьте эту строку:
0 12 * * * /usr/bin/certbot renew --quiet && docker compose restart nginx
```

## 📊 Шаг 11: Настройка мониторинга

### 11.1 Создание systemd сервиса

```bash
sudo nano /etc/systemd/system/tron-staking.service
```

Содержимое:

```ini
[Unit]
Description=TRON Staking Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/tron-staking
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0
User=tronuser
Group=tronuser

[Install]
WantedBy=multi-user.target
```

```bash
# Активация сервиса
sudo systemctl daemon-reload
sudo systemctl enable tron-staking.service
sudo systemctl start tron-staking.service
```

### 11.2 Настройка логирования

```bash
# Создание скрипта для ротации логов
sudo nano /etc/logrotate.d/tron-staking
```

Содержимое:

```
/var/log/tron-staking/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 tronuser tronuser
}
```

## ✅ Шаг 12: Финальная проверка

### 12.1 Проверка всех сервисов

```bash
# Статус контейнеров
docker compose ps

# Проверка ресурсов
docker stats --no-stream

# Проверка логов
docker compose logs --tail=50
```

### 12.2 Функциональное тестирование

1. **WebApp**:
   - Откройте https://obtain-api.online
   - Проверьте переключение языков
   - Протестируйте навигацию

2. **Admin Panel**:
   - Откройте https://admin.obtain-api.online
   - Войдите с логином `admin` и вашим паролем
   - Проверьте статистику

3. **Telegram Bot**:
   - Запустите бота командой `/start`
   - Проверьте WebApp кнопку
   - Протестируйте команды

4. **API**:
   - Проверьте https://obtain-api.online/docs
   - Протестируйте несколько endpoints

## 🎯 Готово!

Ваша TRON Staking Platform успешно развернута и готова к использованию!

### 📋 Итоговый чеклист:

- ✅ Сервер настроен и обновлен
- ✅ Docker установлен и работает
- ✅ Приложение развернуто
- ✅ База данных настроена
- ✅ DNS записи созданы
- ✅ Telegram бот настроен
- ✅ SSL сертификаты установлены (опционально)
- ✅ Мониторинг настроен
- ✅ Все сервисы протестированы

### 🔧 Полезные команды:

```bash
# Просмотр логов
docker compose logs -f

# Перезапуск сервисов
docker compose restart

# Обновление приложения
git pull && docker compose build && docker compose up -d

# Backup базы данных
docker compose exec postgres pg_dump -U postgres tron_staking > backup.sql

# Мониторинг ресурсов
htop
docker stats
```

### 📞 Поддержка:

Если возникли проблемы:

1. Проверьте логи: `docker compose logs`
2. Проверьте статус: `docker compose ps`
3. Проверьте конфигурацию: `cat .env`
4. Обратитесь в поддержку с детальным описанием проблемы

**🎉 Поздравляем! Ваша платформа готова к работе!**
