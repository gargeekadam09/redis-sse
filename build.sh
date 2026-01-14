#!/bin/bash
set -e

echo "Building frontend..."
cd chat-app/frontend

echo "Installing dependencies..."
npm install --legacy-peer-deps

echo "Building React app..."
node node_modules/react-scripts/bin/react-scripts.js build

echo "Build complete!"
