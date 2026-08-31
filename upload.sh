#!/bin/bash

# Docker Deployment Script for AI Telematics Frontend
# Syncs Docker files to the VPS and runs docker compose up --build
set -e

# ── Configuration ────────────────────────────────────────────
REMOTE_USER="ronymia"
REMOTE_HOST="77.68.52.203"
REMOTE_SSH="${REMOTE_USER}@${REMOTE_HOST}"
REMOTE_DIR="/home/deploy/webzoo"
LOCAL_DIR="."

echo "🔄 Syncing project files to ${REMOTE_SSH}:${REMOTE_DIR}..."

# Sync everything EXCEPT heavy/unnecessary local directories.
# node_modules and dist are not needed – the Docker build handles them inside the container.
rsync -rltv --omit-dir-times --delete \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.git' \
    --exclude='.yarn' \
    --exclude='yarn.lock' \
    --exclude='.bun' \
    --exclude='*.DS_Store' \
    --exclude='*.tmp' \
    --exclude='*.log' \
    --exclude='.vscode' \
    --exclude='agent-inputs' \
    --exclude='coverage' \
    -e "ssh -o StrictHostKeyChecking=no" \
    ${LOCAL_DIR}/ ${REMOTE_SSH}:${REMOTE_DIR}/

echo "✅ Files synced successfully!"

echo "🐳 Building Docker image and starting container on remote..."
ssh -o StrictHostKeyChecking=no ${REMOTE_SSH} "cd ${REMOTE_DIR} && docker compose up -d --build --remove-orphans"

echo ""
echo "🚀 Deployment successful!"
echo "🔗 Frontend accessible at: http://${REMOTE_HOST}:4174"
