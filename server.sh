#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Print each command before executing it (useful for debugging)
set -x

# Define the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check for required dependencies
command -v node >/dev/null 2>&1 || { echo >&2 "Node.js is required but not installed. Aborting."; exit 1; }

# Add your script logic below
echo "Starting server script..."

# Example: Start a Node.js server
if [ -f "$SCRIPT_DIR/server.js" ]; then
  node "$SCRIPT_DIR/server.js"
else
  echo "server.js not found in $SCRIPT_DIR. Please ensure the file exists."
  exit 1
fi      



