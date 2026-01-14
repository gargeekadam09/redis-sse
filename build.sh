#!/bin/bash
set -e

echo "Current directory: $(pwd)"
echo "Listing files:"
ls -la

echo "Building frontend..."
cd frontend

echo "Installing dependencies..."
npm install --legacy-peer-deps

echo "Building React app..."
node node_modules/react-scripts/bin/react-scripts.js build

echo "Build complete!"
