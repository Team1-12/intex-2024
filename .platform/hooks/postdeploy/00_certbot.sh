#!/usr/bin/env bash
set -e

DOMAIN="Turtle-env.eba-wpe3e7rb.us-east-1.elasticbeanstalk.com"
EMAIL="johnmgibson3@gmail.com"

# Run Certbot to issue or renew the certificate
sudo certbot --nginx -n --redirect -d "$DOMAIN" --agree-tos --email "$EMAIL"

echo "Certbot certificate has been issued and Nginx has been configured for HTTPS."
