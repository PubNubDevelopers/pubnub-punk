# Ubuntu Server Setup for PubNub Dev Tools Deployment

## Prerequisites

The deployment script assumes the following setup on your Ubuntu server:

### 1. Nginx Installation and Configuration

```bash
# Update package list
sudo apt update

# Install nginx
sudo apt install nginx -y

# Start and enable nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Create the deployment directory
sudo mkdir -p /var/www/html/pubnub-punk

# Set proper ownership
sudo chown -R www-data:www-data /var/www/html/pubnub-punk
sudo chmod -R 755 /var/www/html/pubnub-punk
```

### 2. Archive Directory Setup

```bash
# Create archive directory for backups
mkdir -p /home/ubuntu/archive
```

### 3. SSH Key Permissions

Ensure your local SSH key has proper permissions:

```bash
# On your local machine
chmod 600 /Users/todd/.ssh/awspubnubtodd.pem
```

### 4. Nginx Site Configuration (Optional)

If you want to create a specific site configuration for your app:

```bash
# Create nginx site config
sudo nano /etc/nginx/sites-available/pubnub-punk
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP
    
    root /var/www/html/pubnub-punk;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Optional: Add gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

Enable the site:

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/pubnub-punk /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## Security Considerations

### 1. Firewall Setup

```bash
# Allow SSH and HTTP/HTTPS
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2. SSH Security

Ensure your server only allows key-based authentication and disable password authentication in `/etc/ssh/sshd_config`:

```
PasswordAuthentication no
PubkeyAuthentication yes
```

### 3. Regular Updates

Keep your server updated:

```bash
sudo apt update && sudo apt upgrade -y
```

## Deployment Usage

### Build and Deploy

```bash
# Build the application
npm run build

# Deploy to server
./utils/deploy.sh
```

### Rollback

If deployment fails, use the rollback command provided by the script output, or manually:

```bash
# SSH into server
ssh -i /Users/todd/.ssh/awspubnubtodd.pem ubuntu@52.36.130.43

# List available archives
ls -la /home/ubuntu/archive/

# Restore from specific archive (replace TIMESTAMP with actual timestamp)
sudo rm -rf /var/www/html/pubnub-punk/*
sudo cp -r /home/ubuntu/archive/TIMESTAMP/* /var/www/html/pubnub-punk/
sudo chown -R www-data:www-data /var/www/html/pubnub-punk
sudo systemctl reload nginx
```

## Troubleshooting

### Common Issues

1. **Permission denied errors**: Ensure SSH key permissions are correct (600)
2. **Nginx not serving files**: Check nginx configuration and file permissions
3. **Deployment hangs**: Check firewall settings and SSH connection
4. **Archive directory full**: Clean old archives from `/home/ubuntu/archive/`

### Logs

Check nginx logs if serving issues occur:

```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Manual Verification

Test deployment manually:

```bash
# Check nginx status
sudo systemctl status nginx

# Test file permissions
ls -la /var/www/html/pubnub-punk/

# Test web server response
curl -I http://your-server-ip/
```