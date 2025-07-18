# Source Manager Backend

This is the backend for the Source Manager application.

## Setup

1.  Create a virtual environment: `python -m venv venv`
2.  Activate it: `source venv/bin/activate` (Linux/macOS) or `venv\Scripts\activate` (Windows)
3.  Install dependencies: `pip install -r requirements.txt`
4.  Copy `.env.example` to `.env` and fill in your environment variables.
5.  Run the FastAPI server: `uvicorn app.main:app --reload --port 8000`
6.  Run Celery worker (in a separate terminal, after setting up Redis/RabbitMQ):
    `celery -A app.worker.celery_app worker -l info`

## Project Structure

(Refer to the generated structure)