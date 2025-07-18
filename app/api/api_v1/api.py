from fastapi import APIRouter
from app.api.api_v1.endpoints import tasks_status, documents, urls, indexing, multimedia, google_drive

api_router = APIRouter()

api_router.include_router(tasks_status.router, prefix="/tasks", tags=["tasks-status"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(urls.router, prefix="/urls", tags=["urls"])
api_router.include_router(indexing.router, prefix="/indexing", tags=["indexing"])
api_router.include_router(multimedia.router, prefix="/multimedia", tags=["multimedia"])
api_router.include_router(google_drive.router, prefix="/google-drive", tags=["google-drive"])
