#!/bin/bash

# PubNub Dev Tools Deployment Script
# Deploys the built application to Ubuntu server running nginx
# Usage: ./deploy.sh <ssh_key_path> <server_ip>

set -e

# Check for required parameters
if [ $# -ne 2 ]; then
    echo "Usage: $0 <ssh_key_path> <server_ip>"
    echo "Example: $0 ~/.ssh/mykey.pem 192.168.1.100"
    exit 1
fi

# Configuration from parameters
SSH_KEY="$1"
SERVER_IP="$2"
SERVER_USER="ubuntu"
NGINX_PATH="/var/www/html/pubnub-punk"
ARCHIVE_PATH="/home/ubuntu/archive"
LOCAL_DIST_PATH="./dist"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting deployment to $SERVER_IP${NC}"

# Check if dist directory exists
if [ ! -d "$LOCAL_DIST_PATH" ]; then
    echo -e "${RED}❌ Error: dist/ directory not found. Please run 'npm run build' first.${NC}"
    exit 1
fi

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ Error: SSH key not found at $SSH_KEY${NC}"
    exit 1
fi

# Test SSH connection
echo -e "${YELLOW}🔑 Testing SSH connection...${NC}"
ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes "$SERVER_USER@$SERVER_IP" exit
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Cannot connect to server via SSH${NC}"
    exit 1
fi

# Generate timestamp for archive
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ARCHIVE_DIR="$ARCHIVE_PATH/$TIMESTAMP"

echo -e "${YELLOW}📦 Creating archive directory on server...${NC}"
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "mkdir -p $ARCHIVE_DIR"

echo -e "${YELLOW}📁 Archiving current content...${NC}"
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "
    if [ -d '$NGINX_PATH' ] && [ \"\$(ls -A $NGINX_PATH 2>/dev/null)\" ]; then
        echo 'Archiving existing content to $ARCHIVE_DIR'
        cp -r $NGINX_PATH/* $ARCHIVE_DIR/
        echo 'Archive created successfully'
    else
        echo 'No existing content to archive'
    fi
"

echo -e "${YELLOW}🗑️  Clearing nginx directory...${NC}"
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "
    sudo rm -rf $NGINX_PATH/*
    echo 'Nginx directory cleared'
"

echo -e "${YELLOW}📤 Uploading new content...${NC}"
# Upload to a temporary directory first, then move with sudo
TEMP_DIR="/tmp/pubnub-deploy-$TIMESTAMP"
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "mkdir -p $TEMP_DIR"
scp -i "$SSH_KEY" -r "$LOCAL_DIST_PATH"/* "$SERVER_USER@$SERVER_IP:$TEMP_DIR/"

echo -e "${YELLOW}🔧 Moving files and setting permissions...${NC}"
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "
    sudo mv $TEMP_DIR/* $NGINX_PATH/
    sudo chown -R www-data:www-data $NGINX_PATH
    sudo chmod -R 755 $NGINX_PATH
    rm -rf $TEMP_DIR
    echo 'Files moved and permissions set successfully'
"

echo -e "${YELLOW}🔄 Restarting nginx...${NC}"
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "
    sudo systemctl reload nginx
    if sudo systemctl is-active --quiet nginx; then
        echo 'Nginx reloaded successfully'
    else
        echo 'Warning: Nginx may not be running properly'
        sudo systemctl status nginx
    fi
"

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Your application should now be live on the server${NC}"
echo -e "${YELLOW}📋 Archive created at: $ARCHIVE_DIR${NC}"
echo ""
echo -e "${YELLOW}To rollback, run:${NC}"
echo "ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP \"sudo rm -rf $NGINX_PATH/* && sudo cp -r $ARCHIVE_DIR/* $NGINX_PATH/ && sudo chown -R www-data:www-data $NGINX_PATH && sudo systemctl reload nginx\""