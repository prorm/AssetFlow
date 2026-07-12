#!/bin/bash
echo "===================================="
echo "  AssetFlow Environment Setup (Unix)"
echo "===================================="
echo ""

echo "[1/3] Installing Server Dependencies..."
cd server
npm install
cd ..
echo ""

echo "[2/3] Installing Client Dependencies..."
cd client
npm install
cd ..
echo ""

echo "[3/3] Installing Python Dependencies for Live Data Simulator..."
pip3 install -r setup/requirements.txt
echo ""

echo "===================================="
echo "  Setup Complete!"
echo "===================================="
echo ""
echo "To start the backend server, run:"
echo "  cd server && npm run dev"
echo ""
echo "To start the frontend client, run:"
echo "  cd client && npm run dev"
echo ""
echo "To run the live data simulator, run:"
echo "  cd server/scripts && python3 live_data.py"
echo ""
