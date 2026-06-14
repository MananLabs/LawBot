"""
Export routes: serve PDF/DOCX files for generated documents and reports.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_active_user
from app.database import get_db
from app.models.user import User
from app.services.export_service import ExportService

router = APIRouter(prefix="/export", tags=["Export"])


@router.get(
    "/documents/{document_id}",
    summary="Download a generated document as PDF or DOCX",
)
async def download_generated_document(
    document_id: str,
    format: str = Query(default="docx", regex="^(pdf|docx)$"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Export and download a generated legal document.
    Triggers rendering on first call; subsequent calls serve cached file.
    """
    service = ExportService(db)
    try:
        file_path, filename, _ = await service.export_generated_document(
            document_id=document_id,
            format=format,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        )

    media_types = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    return FileResponse(
        path=str(file_path),
        media_type=media_types[format],
        filename=filename,
    )


@router.get(
    "/contracts/{analysis_id}",
    summary="Download a contract analysis report as PDF or DOCX",
)
async def download_contract_analysis(
    analysis_id: str,
    format: str = Query(default="pdf", regex="^(pdf|docx)$"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Export and download a contract analysis report."""
    service = ExportService(db)
    try:
        file_path, filename = await service.export_contract_analysis(
            analysis_id=analysis_id,
            format=format,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        )

    media_types = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    return FileResponse(
        path=str(file_path),
        media_type=media_types[format],
        filename=filename,
    )


@router.post(
    "/compliance",
    summary="Generate and download a compliance report",
)
async def download_compliance_report(
    format: str = Query(default="pdf", regex="^(pdf|docx)$"),
    framework: str | None = Query(default=None),
    include_recommendations: bool = Query(default=True),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate and download a compliance report for the current user."""
    service = ExportService(db)
    try:
        file_path, filename = await service.export_compliance_report(
            user_id=str(current_user.id),
            framework=framework,
            format=format,
            include_recommendations=include_recommendations,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        )

    media_types = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    return FileResponse(
        path=str(file_path),
        media_type=media_types[format],
        filename=filename,
    )
