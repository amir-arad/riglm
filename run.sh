#!/bin/bash

# Start the server in the background
cd server && npm start &
SERVER_PID=$!

# Wait a moment for server to initialize
sleep 2

# Function to handle Ctrl+C
cleanup() {
    echo "Stopping inspector..."
    exit 0
}

# Set up trap for Ctrl+C
trap cleanup SIGINT

# Start the MCP inspector (this will run in foreground)
npx @modelcontextprotocol/inspector http://localhost:56667/main/sse

# Keep the server running after inspector exits
wait $SERVER_PID