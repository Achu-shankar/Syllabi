@echo off
REM Replace 'myenv' with your conda environment name
SET ENV_NAME=reference_manager_env

REM Replace these with your actual app and celery module names
SET FASTAPI_MODULE=app.main:app
SET CELERY_MODULE=app.worker.celery_app

REM Activate conda base first (adjust path if needed)
CALL conda activate %ENV_NAME%

REM Start Uvicorn in a new window
start "Uvicorn" cmd /k "conda activate %ENV_NAME% && uvicorn %FASTAPI_MODULE% --reload"

REM Start Celery worker in a new window
start "Celery" cmd /k "conda activate %ENV_NAME% && celery -A %CELERY_MODULE% worker -P solo --loglevel=info"

@REM REM start Redis docker container in a new window
start "Redis" cmd /k "conda activate %ENV_NAME% && docker run -d --name redis-container -p 6379:6379 redis:latest"
@REM echo Both Uvicorn and Celery should now be running in separate windows.
pause
