#!/bin/bash

# Set default port if PORT environment variable is not set
if [ -z "$PORT" ]; then
    export PORT=8000
fi

echo "Starting server on port $PORT"
uvicorn app.main:app --host 0.0.0.0 --port $PORT
