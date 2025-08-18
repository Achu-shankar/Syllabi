#!/bin/bash

echo "DEBUG: PORT environment variable = '$PORT'"
echo "DEBUG: All environment variables:"
env | grep PORT || echo "No PORT variables found"

# Set default port if PORT environment variable is not set
if [ -z "$PORT" ]; then
    export PORT=8000
    echo "DEBUG: No PORT provided, defaulting to 8000"
else
    echo "DEBUG: Using provided PORT=$PORT"
fi

echo "Starting server on port $PORT"
uvicorn app.main:app --host 0.0.0.0 --port $PORT
