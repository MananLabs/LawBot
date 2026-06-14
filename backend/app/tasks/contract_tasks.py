"""
Contract analysis background tasks.
"""
import asyncio
from typing import Optional

import structlog

from app.tasks.celery_app import celery_app

logger = structlog.get_logger(__name__)


def _run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(
    name="app.tasks.contract_tasks.analyze_contract_async",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
    queue="analysis",
    time_limit=600,  # 10-minute hard limit
    soft_time_limit=540,
)
def analyze_contract_async(
    self,
    analysis_id: str,
    document_id: Optional[str],
    contract_text: Optional[str],
    user_id: str,
    llm_provider: Optional[str] = None,
    analysis_type: str = "comprehensive",
) -> dict:
    """
    Run full contract analysis in background:
    1. Retrieve document text (from DB or raw input)
    2. RAG retrieval for relevant legal precedents
    3. LLM clause-by-clause analysis
    4. Risk scoring
    5. Store results
    """
    logger.info("Starting contract analysis", analysis_id=analysis_id, task_id=self.request.id)

    async def _analyze():
        from app.database import AsyncSessionLocal
        from app.services.contract_analyzer import ContractAnalyzerService
        from app.schemas.contract import ContractAnalysisRequest

        async with AsyncSessionLocal() as db:
            service = ContractAnalyzerService(db)
            try:
                await service.update_analysis_status(analysis_id, "analyzing", progress=5)

                request = ContractAnalysisRequest(
                    document_id=document_id,
                    contract_text=contract_text,
                    analysis_type=analysis_type,
                )

                result = await service.run_analysis(
                    analysis_id=analysis_id,
                    request=request,
                    llm_provider=llm_provider,
                )

                await service.update_analysis_status(analysis_id, "completed", progress=100)
                logger.info("Contract analysis completed", analysis_id=analysis_id)
                return {"status": "completed", "analysis_id": analysis_id}

            except Exception as exc:
                logger.error("Contract analysis failed", analysis_id=analysis_id, error=str(exc))
                await service.update_analysis_status(
                    analysis_id, "failed", error=str(exc)
                )
                raise self.retry(exc=exc)

    return _run_async(_analyze())


@celery_app.task(
    name="app.tasks.contract_tasks.generate_clause_alternative",
    bind=True,
    max_retries=2,
    queue="analysis",
    time_limit=120,
)
def generate_clause_alternative(
    self,
    analysis_id: str,
    clause_id: str,
    instruction: Optional[str] = None,
) -> dict:
    """Generate AI alternative language for a specific contract clause."""
    async def _generate():
        from app.database import AsyncSessionLocal
        from app.services.contract_analyzer import ContractAnalyzerService

        async with AsyncSessionLocal() as db:
            service = ContractAnalyzerService(db)
            try:
                result = await service.generate_clause_alternative(
                    analysis_id=analysis_id,
                    clause_id=clause_id,
                    instruction=instruction,
                )
                return result
            except Exception as exc:
                raise self.retry(exc=exc)

    return _run_async(_generate())


@celery_app.task(
    name="app.tasks.contract_tasks.export_analysis_report",
    bind=True,
    max_retries=1,
    queue="exports",
    time_limit=120,
)
def export_analysis_report(self, analysis_id: str, format: str = "pdf", user_id: str = "") -> dict:
    """Generate a downloadable PDF/DOCX contract analysis report."""
    async def _export():
        from app.database import AsyncSessionLocal
        from app.services.export_service import ExportService

        async with AsyncSessionLocal() as db:
            service = ExportService(db)
            try:
                file_path, filename = await service.export_contract_analysis(
                    analysis_id=analysis_id,
                    format=format,
                )
                return {"file_path": str(file_path), "filename": filename, "format": format}
            except Exception as exc:
                raise self.retry(exc=exc)

    return _run_async(_export())
