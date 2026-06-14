"""
Celery application instance for LawBot background tasks.
"""
from celery import Celery
from app.config import settings

celery_app = Celery(
    "lawbot",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.tasks.document_tasks",
        "app.tasks.contract_tasks",
        "app.tasks.compliance_tasks",
        "app.tasks.export_tasks",
    ],
)

celery_app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    # Timezone
    timezone="Asia/Kolkata",
    enable_utc=True,
    # Task behavior
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_reject_on_worker_lost=True,
    # Result expiry
    result_expires=86400,  # 24 hours
    # Rate limits
    task_default_rate_limit="100/m",
    # Retry policy
    task_max_retries=3,
    task_default_retry_delay=60,
    # Concurrency
    worker_max_tasks_per_child=100,
    # Beat schedule for periodic tasks
    beat_schedule={
        "refresh-compliance-deadlines": {
            "task": "app.tasks.compliance_tasks.refresh_compliance_deadlines",
            "schedule": 3600.0,  # every hour
        },
        "cleanup-expired-files": {
            "task": "app.tasks.document_tasks.cleanup_expired_temp_files",
            "schedule": 86400.0,  # daily
        },
        "process-pending-documents": {
            "task": "app.tasks.document_tasks.process_pending_documents",
            "schedule": 300.0,  # every 5 minutes
        },
    },
)
