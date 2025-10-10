#!/bin/bash

echo "=== Starting Celery Worker ==="
echo "DEBUG: Available memory:"
cat /proc/meminfo | head -3 || echo "Cannot read memory info"

echo "DEBUG: CPU info:"
nproc || echo "Cannot read CPU count"

echo "DEBUG: Redis connection:"
echo "CELERY_BROKER_URL: $CELERY_BROKER_URL"

# Use low concurrency for Railway's resource limits
# Railway typically provides 1-2 vCPUs, so 2-4 workers max
CONCURRENCY=${WORKER_CONCURRENCY:-2}

echo "Starting Celery worker with concurrency=$CONCURRENCY"
celery -A app.worker.celery_app worker \
    --loglevel=info \
    --concurrency=$CONCURRENCY \
    --max-tasks-per-child=50 \
    --prefetch-multiplier=1
