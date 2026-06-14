"""
File handling utilities: validation, storage, and cleanup.
"""
import os
import uuid
from pathlib import Path
from typing import Tuple

import aiofiles
import structlog
from fastapi import HTTPException, UploadFile, status

from app.config import settings

logger = structlog.get_logger(__name__)

# Magic bytes for file type validation
FILE_MAGIC_BYTES = {
    "pdf": [b"%PDF"],
    "docx": [b"PK\x03\x04"],  # ZIP-based format
    "doc": [b"\xd0\xcf\x11\xe0"],  # OLE2 Compound Document
    "xlsx": [b"PK\x03\x04"],  # ZIP-based format
    "xls": [b"\xd0\xcf\x11\xe0"],  # OLE2 Compound Document
    "txt": [],  # No magic bytes, rely on extension
}


class FileHandler:
    """
    Handles file validation, storage, and cleanup for document uploads.
    """

    def __init__(self) -> None:
        self.upload_dir = Path(settings.upload_dir)
        self.max_size = settings.max_file_size_bytes
        self.allowed_types = settings.allowed_file_types_list
        self._ensure_upload_dir()

    def _ensure_upload_dir(self) -> None:
        """Create upload directory and user subdirectory structure."""
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def _get_user_dir(self, user_id: str) -> Path:
        """Get or create a user-specific upload directory."""
        user_dir = self.upload_dir / user_id
        user_dir.mkdir(parents=True, exist_ok=True)
        return user_dir

    async def validate_file(self, file: UploadFile) -> None:
        """
        Validate uploaded file for type and size.

        Args:
            file: The uploaded file to validate

        Raises:
            HTTPException 400: If file type is not allowed
            HTTPException 413: If file size exceeds limit
            HTTPException 400: If file appears to be empty
        """
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No filename provided.",
            )

        # Check file extension
        ext = Path(file.filename).suffix.lstrip(".").lower()
        if ext not in self.allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type '{ext}' is not allowed. Supported types: {', '.join(self.allowed_types)}",
            )

        # Read first bytes to check size and magic bytes
        header = await file.read(32)
        if not header:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File appears to be empty.",
            )

        # Validate magic bytes for known binary formats
        magic_bytes = FILE_MAGIC_BYTES.get(ext, [])
        if magic_bytes and not any(header.startswith(mb) for mb in magic_bytes):
            # Allow DOCX/XLSX as both are ZIP-based; some tools save differently
            if ext not in ("docx", "xlsx", "txt"):
                logger.warning(
                    "File magic bytes mismatch",
                    filename=file.filename,
                    ext=ext,
                )

        # Reset file position for full read
        await file.seek(0)

        # Check total size by reading in chunks
        total_size = 0
        chunk_size = 65536  # 64KB chunks

        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > self.max_size:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File size exceeds the maximum limit of {settings.max_file_size_mb}MB.",
                )

        # Reset for actual save
        await file.seek(0)

        logger.info(
            "File validation passed",
            filename=file.filename,
            size=total_size,
            type=ext,
        )

    async def save_file(
        self, file: UploadFile, user_id: str
    ) -> Tuple[str, str, int]:
        """
        Save an uploaded file to disk with a unique name.

        Args:
            file: The uploaded file
            user_id: The user's ID for directory organization

        Returns:
            Tuple of (file_path, stored_filename, file_size_bytes)
        """
        user_dir = self._get_user_dir(user_id)

        # Generate unique filename preserving extension
        ext = Path(file.filename).suffix.lower()
        stored_name = f"{uuid.uuid4()}{ext}"
        file_path = user_dir / stored_name

        total_size = 0
        chunk_size = 65536  # 64KB

        async with aiofiles.open(file_path, "wb") as f:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                await f.write(chunk)
                total_size += len(chunk)

        logger.info(
            "File saved",
            path=str(file_path),
            original_name=file.filename,
            size=total_size,
        )

        return str(file_path), stored_name, total_size

    def delete_file(self, file_path: str) -> bool:
        """
        Delete a file from disk.

        Args:
            file_path: Absolute path to the file

        Returns:
            True if deleted, False if not found
        """
        path = Path(file_path)
        if path.exists():
            path.unlink()
            logger.info("File deleted", path=file_path)
            return True
        return False

    def get_file_path(self, stored_filename: str, user_id: str) -> str:
        """Get the full file path for a stored file."""
        return str(self.upload_dir / user_id / stored_filename)

    def file_exists(self, file_path: str) -> bool:
        """Check if a file exists on disk."""
        return Path(file_path).exists()

    async def cleanup_user_files(self, user_id: str) -> int:
        """
        Delete all files for a specific user.
        Used when deleting user account.

        Returns:
            Count of files deleted
        """
        user_dir = self.upload_dir / user_id
        count = 0

        if user_dir.exists():
            for file in user_dir.iterdir():
                if file.is_file():
                    file.unlink()
                    count += 1
            user_dir.rmdir()

        logger.info("User files cleaned up", user_id=user_id, count=count)
        return count
