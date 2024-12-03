#!/usr/bin/env bash

# Define domain name
DOMAIN="Turtle-env.eba-wpe3e7rb.us-east-1.elasticbeanstalk.com"

# Install Certbot and dependencies
if ! command -v certbot &>/dev/null; then
    sudo dnf install -y python3 augeas-libs
    sudo python3 -m venv /opt/certbot
    sudo /opt/certbot/bin/pip install --upgrade pip
    sudo /opt/certbot/bin/pip install certbot certbot-nginx
    sudo ln -s /opt/certbot/bin/certbot /usr/bin/certbot
fi

# Obtain SSL certificates using Certbot
sudo certbot -n --nginx -d $DOMAIN --agree-tos --email johnmgibson3@gmail.com

# Create Nginx configuration file
NGINX_CONF="/etc/nginx/conf.d/${DOMAIN}.conf"

sudo tee $NGINX_CONF > /dev/null <<EOL
server {
    listen 443 ssl;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    location / {
        proxy_pass http://localhost:5001; # Forward requests to Elastic Beanstalk backend
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}

server {
    listen 80;
    server_name $DOMAIN;

    # Redirect HTTP to HTTPS
    return 301 https://\$host\$request_uri;
}
EOL

# Restart Nginx to apply changes
sudo systemctl restart nginx
