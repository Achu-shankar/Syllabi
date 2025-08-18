# Use Python 3.11 slim base image for smaller size
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies required for various packages
RUN apt-get update && apt-get install -y \
    # WeasyPrint dependencies
    libpango-1.0-0 \
    libharfbuzz0b \
    libpangoft2-1.0-0 \
    libgtk-3-0 \
    libgdk-pixbuf-xlib-2.0-0 \
    libffi-dev \
    shared-mime-info \
    # Multimedia processing dependencies
    ffmpeg \
    # General utilities
    curl \
    wget \
    gcc \
    g++ \
    # Font support
    fonts-liberation \
    fonts-dejavu-core \
    fontconfig \
    # Cleanup
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Try to install wkhtmltopdf for pdfkit (optional - fallback available)
RUN apt-get update && \
    (apt-get install -y --no-install-recommends wkhtmltopdf || \
     echo "WARNING: wkhtmltopdf not available - pdfkit will use alternative methods") && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements first for better Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers and system dependencies (optional - skip if fails)
RUN playwright install-deps && playwright install chromium || \
    echo "WARNING: Playwright installation failed - URL processing with browser automation will be disabled"

# Copy application code
COPY app/ ./app/

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

# Expose port (Railway will provide PORT env var)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Default command (can be overridden for different services)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
