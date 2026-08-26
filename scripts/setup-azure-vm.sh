#!/usr/bin/env bash
# One-time setup script for Azure VM (Ubuntu 22.04 LTS)
# Run as: bash setup-azure-vm.sh
set -e

echo "=== GMAO Azure VM Setup ==="

# ── 1. System updates ─────────────────────────────────────
echo "--> Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# ── 2. Install Docker ─────────────────────────────────────
echo "--> Installing Docker..."
sudo apt-get install -y ca-certificates curl gnupg lsb-release

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -qq
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add azureuser to docker group (no sudo needed for docker commands)
sudo usermod -aG docker azureuser

# ── 3. Install git ─────────────────────────────────────────
echo "--> Installing git..."
sudo apt-get install -y git

# ── 4. Open firewall ports ─────────────────────────────────
echo "--> Configuring UFW firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp    # Frontend
sudo ufw allow 8000/tcp  # Laravel API
sudo ufw allow 8080/tcp  # Reverb WebSocket
sudo ufw --force enable

# ── 5. Clone the repository ────────────────────────────────
echo "--> Setting up /opt/gmao..."
sudo mkdir -p /opt/gmao
sudo chown azureuser:azureuser /opt/gmao

REPO_URL="${1:-https://github.com/hachemdhawadiRSE/gmao-app.git}"
git clone "$REPO_URL" /opt/gmao
cd /opt/gmao

# ── 6. Create production .env ──────────────────────────────
echo "--> Creating .env from template..."
cp .env.prod.example .env

echo ""
echo "============================================================"
echo " Setup complete!"
echo ""
echo " NEXT STEPS:"
echo " 1. Edit /opt/gmao/.env and fill in your secrets:"
echo "    nano /opt/gmao/.env"
echo ""
echo " 2. Add your GitHub Secrets (Settings > Secrets > Actions):"
echo "    AZURE_VM_IP         = $(curl -s ifconfig.me)"
echo "    AZURE_SSH_PRIVATE_KEY = (paste your SSH private key)"
echo "    GHCR_TOKEN          = (GitHub PAT with read:packages)"
echo "    APP_KEY             = (php artisan key:generate --show)"
echo "    DB_ROOT_PASSWORD    = (strong password)"
echo "    DB_PASSWORD         = (strong password)"
echo "    GROQ_API_KEY        = (your Groq API key)"
echo ""
echo " 3. Push to main branch — CI/CD will do the rest."
echo "============================================================"
