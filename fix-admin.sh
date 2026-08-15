#!/bin/bash
# Complete Admin Panel Fix Script

echo "Step 1: Stop any running server..."
pkill -f "node.*server" 2>/dev/null || true

echo "Step 2: Rebuild web with admin layout..."
cd /sessions/optimistic-upbeat-brown/mnt/velora-platform/web
node node_modules/vite/bin/vite.js build 2>&1 | tail -20

echo ""
echo "Step 3: If build succeeded, restart server..."
cd /sessions/optimistic-upbeat-brown/mnt/velora-platform
node server/dist/index.js &
sleep 3

echo ""
echo "Done! Check http://localhost:3000/admin"