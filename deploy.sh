#!/bin/bash

# TRON Staking Platform Deployment Script
# For Ubuntu 24.04 server deployment

set -e

echo "🚀 Starting TRON Staking Platform deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root and create user if needed
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}⚠️ Running as root, will create dedicated user for application${NC}"
    
    # Create tronuser if doesn't exist
    if ! id "tronuser" &>/dev/null; then
        echo -e "${YELLOW}👤 Creating tronuser...${NC}"
        useradd -m -s /bin/bash tronuser
        usermod -aG sudo tronuser
        echo -e "${GREEN}✅ User tronuser created${NC}"
    else
        echo -e "${GREEN}✅ User tronuser already exists${NC}"
    fi
    
    APP_USER="tronuser"
    SUDO_PREFIX="sudo -u tronuser"
    echo -e "${YELLOW}ℹ️ Application will run as user: $APP_USER${NC}"
else
    APP_USER="$USER"
    SUDO_PREFIX=""
    echo -e "${YELLOW}ℹ️ Application will run as user: $APP_USER${NC}"
fi

# Server configuration
SERVER_IP="188.225.25.31"
DOMAIN="obtain-api.online"
ADMIN_DOMAIN="admin.obtain-api.online"

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "Server IP: $SERVER_IP"
echo "Main domain: $DOMAIN"
echo "Admin domain: $ADMIN_DOMAIN"
echo ""

# Update system packages
echo -e "${YELLOW}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install required packages
echo -e "${YELLOW}📦 Installing required packages...${NC}"
sudo apt install -y \
    curl \
    wget \
    git \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Install Docker
echo -e "${YELLOW}🐳 Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io
    sudo usermod -aG docker $APP_USER
    echo -e "${GREEN}✅ Docker installed successfully${NC}"
else
    echo -e "${GREEN}✅ Docker already installed${NC}"
fi

# Make sure user is in docker group
if ! groups $APP_USER | grep -q docker; then
    sudo usermod -aG docker $APP_USER
    echo -e "${GREEN}✅ Added $APP_USER to docker group${NC}"
    if [ "$EUID" -ne 0 ]; then
        echo -e "${YELLOW}⚠️ You may need to log out and back in for group changes to take effect${NC}"
    fi
fi

# Install Docker Compose
echo -e "${YELLOW}🐳 Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✅ Docker Compose installed successfully${NC}"
else
    echo -e "${GREEN}✅ Docker Compose already installed${NC}"
fi

# Create application directory
echo -e "${YELLOW}📁 Setting up application directory...${NC}"
APP_DIR="/opt/tron-staking"
sudo mkdir -p $APP_DIR
sudo chown $APP_USER:$APP_USER $APP_DIR

# Copy application files (assuming script is run from project directory)
echo -e "${YELLOW}📋 Copying application files...${NC}"
if [ "$EUID" -eq 0 ]; then
    cp -r . $APP_DIR/
    chown -R $APP_USER:$APP_USER $APP_DIR
else
    cp -r . $APP_DIR/
fi
cd $APP_DIR

# Create environment file
echo -e "${YELLOW}⚙️ Creating environment configuration...${NC}"
if [ ! -f .env ]; then
    cp env.example .env
    echo -e "${YELLOW}⚠️ Please edit .env file with your configuration${NC}"
    echo "Especially update these values:"
    echo "- TELEGRAM_BOT_TOKEN"
    echo "- TRON_API_KEY"
    echo "- DEPOSIT_ADDRESS"
    echo "- HOT_WALLET_PRIVATE_KEY"
    echo "- SECRET_KEY"
    echo "- ADMIN_PASSWORD"
    echo ""
    read -p "Press Enter after updating .env file..."
fi

# Create logs directory
sudo mkdir -p /var/log/tron-staking
sudo chown $APP_USER:$APP_USER /var/log/tron-staking

# Create SSL directory (for future SSL setup)
sudo mkdir -p /etc/nginx/ssl
sudo chown $APP_USER:$APP_USER /etc/nginx/ssl

# Install Python and pip (for development/debugging)
echo -e "${YELLOW}🐍 Installing Python...${NC}"
sudo apt install -y python3 python3-pip python3-venv

# Install Node.js (for any frontend tooling if needed)
echo -e "${YELLOW}📱 Installing Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    echo -e "${GREEN}✅ Node.js installed successfully${NC}"
else
    echo -e "${GREEN}✅ Node.js already installed${NC}"
fi

# Set up firewall
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8000/tcp  # For development
echo -e "${GREEN}✅ Firewall configured${NC}"

# Create systemd service for the application
echo -e "${YELLOW}🔧 Creating systemd service...${NC}"
sudo tee /etc/systemd/system/tron-staking.service > /dev/null <<EOF
[Unit]
Description=TRON Staking Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0
User=$APP_USER
Group=$APP_USER

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable tron-staking.service

# Build and start the application
echo -e "${YELLOW}🏗️ Building and starting application...${NC}"
if [ "$EUID" -eq 0 ]; then
    sudo -u $APP_USER docker-compose build
    sudo -u $APP_USER docker-compose up -d
else
    docker-compose build
    docker-compose up -d
fi

# Wait for services to start
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 30

# Run database migrations
echo -e "${YELLOW}📊 Running database migrations...${NC}"
if [ "$EUID" -eq 0 ]; then
    sudo -u $APP_USER docker-compose exec -T backend alembic upgrade head
else
    docker-compose exec -T backend alembic upgrade head
fi

# Create initial admin user
echo -e "${YELLOW}👤 Creating initial admin user...${NC}"
if [ "$EUID" -eq 0 ]; then
    sudo -u $APP_USER docker-compose exec -T backend python -c "
import sys
sys.path.append('/app')
from backend.database import SessionLocal
from backend import crud
from backend.config import settings

db = SessionLocal()
try:
    admin = crud.get_admin_by_username(db, 'admin')
    if not admin:
        crud.create_admin_user(db, 'admin', settings.admin_password)
        print('Admin user created successfully')
    else:
        print('Admin user already exists')
finally:
    db.close()
"
else
    docker-compose exec -T backend python -c "
import sys
sys.path.append('/app')
from backend.database import SessionLocal
from backend import crud
from backend.config import settings

db = SessionLocal()
try:
    admin = crud.get_admin_by_username(db, 'admin')
    if not admin:
        crud.create_admin_user(db, 'admin', settings.admin_password)
        print('Admin user created successfully')
    else:
        print('Admin user already exists')
finally:
    db.close()
"
fi

# Check service status
echo -e "${YELLOW}🔍 Checking service status...${NC}"
if [ "$EUID" -eq 0 ]; then
    sudo -u $APP_USER docker-compose ps
else
    docker-compose ps
fi

# Test API endpoint
echo -e "${YELLOW}🧪 Testing API endpoint...${NC}"
if curl -f http://localhost:8000/api/deposit-info > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API is responding${NC}"
else
    echo -e "${RED}❌ API is not responding${NC}"
fi

# Display final information
echo ""
echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo ""
echo -e "${YELLOW}📋 Service Information:${NC}"
echo "Application directory: $APP_DIR"
echo "Logs directory: /var/log/tron-staking"
echo ""
echo -e "${YELLOW}🌐 URLs:${NC}"
echo "Main WebApp: http://$DOMAIN (or http://$SERVER_IP)"
echo "Admin Panel: http://$ADMIN_DOMAIN/admin (or http://$SERVER_IP/admin)"
echo "API Documentation: http://$SERVER_IP:8000/docs"
echo ""
echo -e "${YELLOW}🔧 Management Commands:${NC}"
echo "Start services: sudo systemctl start tron-staking"
echo "Stop services: sudo systemctl stop tron-staking"
if [ "$EUID" -eq 0 ]; then
    echo "View logs: sudo -u $APP_USER docker-compose logs -f"
    echo "View specific service logs: sudo -u $APP_USER docker-compose logs -f [backend|bot|monitor|nginx]"
else
    echo "View logs: docker-compose logs -f"
    echo "View specific service logs: docker-compose logs -f [backend|bot|monitor|nginx]"
fi
echo ""
echo -e "${YELLOW}⚠️ Next Steps:${NC}"
echo "1. Configure your domain DNS to point to $SERVER_IP"
echo "2. Set up SSL certificates (Let's Encrypt recommended)"
echo "3. Update Telegram bot webhook URL"
echo "4. Test the complete flow"
echo ""
echo -e "${YELLOW}🔐 Admin Login:${NC}"
echo "Username: admin"
echo "Password: (check .env file ADMIN_PASSWORD)"
echo ""
echo -e "${GREEN}✅ TRON Staking Platform is now running!${NC}"
