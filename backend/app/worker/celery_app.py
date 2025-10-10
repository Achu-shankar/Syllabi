from celery import Celery
from app.core.config import settings

# Give the app a name that reflects its module path, can sometimes help.
celery_app = Celery(
    'app.worker', # Using the package name where celery_app resides
    broker=settings.CELERY_BROKER_URL, 
    backend=settings.CELERY_RESULT_BACKEND_URL,
    include=['app.worker.tasks_document', 
             'app.worker.tasks_url',
             'app.worker.tasks_indexing',
             'app.worker.tasks_multimedia',
             'app.worker.tasks_multimedia_indexing',
             'app.worker.tasks_google_drive_simple',
             'app.worker.tasks_notion_simple'
             ]
)

# Autodiscover tasks from the 'app.worker' package itself.
# Celery will look for tasks in modules within app.worker (e.g. app.worker.tasks_document)
celery_app.autodiscover_tasks(packages=['app.worker']) # Explicitly name the argument

# Optional: Further Celery configurations
# celery_app.conf.update(task_track_started=True)

# This tells Celery to look for task modules (e.g., tasks.py) 
# within packages listed here, relative to the Celery app's location.
# If your tasks are in app/worker/tasks_document.py, app/worker/tasks_url.py etc.,
# then "app.worker" is the correct path for autodiscovery.
# Keeping this might be redundant if `include` covers all modules, but generally harmless.
celery_app.autodiscover_tasks(["app.worker"])

# Optional: Further Celery configurations can be added here if needed
# For example, to ensure tasks report their "started" state:
# celery_app.conf.update(task_track_started=True)

# To ensure tasks are routed correctly if you have multiple queues or complex routing:
# celery_app.conf.task_default_queue = 'default'
# celery_app.conf.task_routes = {
# 'app.worker.tasks_document.process_document_task': {'queue': 'document_processing'},
# }

celery_app.conf.update(
    task_serializer='json',
    result_serializer='json',
    accept_content=['json']
)
