#!/bin/bash

# Exit on error
set -e

echo "Building client..."
cd client
npm ci
npm run build
cd ..

echo "Building server..."
cd server
npm ci
npm run build
cd ..

echo "Building Docker container..."
docker-compose build

echo "Build completed successfully!"