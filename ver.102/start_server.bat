@echo off
title JX-IDLE Node.js Realtime Server (v.2)
cd /d "%~dp0"

echo ==================================================================
echo           JX-IDLE - NODE.JS AND MYSQL REALTIME SERVER
echo ==================================================================
echo [System] Cleaning port 8080...
powershell -NoProfile -Command "$p = (Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue).OwningProcess; if ($p) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }"

if not exist node_modules (
    echo [System] Installing packages...
    call npm install
)

echo [System] Starting server with Nodemon...
echo ------------------------------------------------------------------
call npm run dev
pause
