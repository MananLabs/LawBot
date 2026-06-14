"""
Text processing utilities: chunking, cleaning, and normalization.
Handles legal document text for optimal embedding and retrieval.
"""
import re
import unicodedata
from typing import List, Dict, Any, Optional

import structlog

logger = structlog.get_logger(__name__)


class TextProcessor:
    """
    Handles text chunking and cleaning for legal documents.
    Optimized for Indian legal documents with:
    - Section-aware chunking (respects legal section boundaries)
    - Overlap for context continuity
    - Metadata enrichment per chunk
    """

    # Legal section heading patterns common in Indian legal documents
    SECTION_PATTERNS = [
        r"^(?:Article|Section|Clause|Schedule|Annexure|Exhibit)\s+\d+",
        r"^\d+\.\d*\s+[A-Z]",
        r"^[IVX]+\.\s+[A-Z]",
        r"^WHEREAS",
        r"^NOW\s+THEREFORE",
        r"^IN\s+WITNESS\s+WHEREOF",
    ]

    def __init__(self) -> None:
        self._section_regex = re.compile(
            "|".join(self.SECTION_PATTERNS),
            re.MULTILINE | re.IGNORECASE,
        )

    def chunk_text(
        self,
        text: str,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        document_id: Optional[str] = None,
        filename: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Split text into overlapping chunks for embedding.

        Uses a sliding window approach with semantic boundary detection:
        1. Tries to split at paragraph/section boundaries
        2. Falls back to sentence boundaries
        3. Falls back to character-level splitting

        Args:
            text: The full document text
            chunk_size: Target characters per chunk
            chunk_overlap: Overlapping characters between chunks
            document_id: Optional document ID for metadata
            filename: Optional filename for metadata

        Returns:
            List of chunk dicts with 'text', 'chunk_index', 'metadata'
        """
        if not text or not text.strip():
            return []

        # Clean the text first
        text = self.clean_text(text)

        # Split into semantic units (paragraphs)
        paragraphs = self._split_into_paragraphs(text)

        # Build chunks from paragraphs
        chunks = self._build_chunks(
            paragraphs=paragraphs,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )

        # Enrich with metadata
        result = []
        for idx, chunk_text in enumerate(chunks):
            if not chunk_text.strip():
                continue
            result.append({
                "text": chunk_text.strip(),
                "chunk_index": idx,
                "document_id": document_id,
                "filename": filename,
                "char_count": len(chunk_text),
                "page_number": self._estimate_page_number(idx, len(chunks)),
            })

        logger.info(
            "Text chunked",
            total_chunks=len(result),
            total_chars=len(text),
            chunk_size=chunk_size,
        )

        return result

    def clean_text(self, text: str) -> str:
        """
        Clean and normalize text from legal documents.

        Handles:
        - Unicode normalization
        - Removal of non-printable characters
        - Collapse of excessive whitespace
        - Fixing common OCR artifacts
        - Preserving legal formatting
        """
        if not text:
            return ""

        # Normalize unicode (handles ligatures, special chars)
        text = unicodedata.normalize("NFKC", text)

        # Remove null bytes and other non-printable chars (except newlines)
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", text)

        # Fix common OCR artifacts
        text = self._fix_ocr_artifacts(text)

        # Normalize whitespace within lines (but preserve line structure)
        lines = text.split("\n")
        cleaned_lines = []
        for line in lines:
            # Collapse multiple spaces within a line
            line = re.sub(r" {2,}", " ", line)
            line = line.strip()
            cleaned_lines.append(line)

        text = "\n".join(cleaned_lines)

        # Collapse more than 3 consecutive newlines to 2
        text = re.sub(r"\n{3,}", "\n\n", text)

        return text.strip()

    def _fix_ocr_artifacts(self, text: str) -> str:
        """Fix common OCR errors in scanned legal documents."""
        # Fix broken words at line ends (hyphenation)
        text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)

        # Fix incorrect period+space within abbreviations (e.g., "Sec. 10")
        # This is a heuristic and may not always be correct
        text = re.sub(r"(?<=[A-Z])\.(?=[A-Z])", ". ", text)

        # Normalize em-dashes and en-dashes
        text = text.replace("–", "-").replace("—", " - ")

        # Normalize quotes
        text = text.replace("‘", "'").replace("’", "'")
        text = text.replace("“", '"').replace("”", '"')

        return text

    def _split_into_paragraphs(self, text: str) -> List[str]:
        """
        Split text into semantic paragraphs using legal document structure.
        Preserves section headings with their content.
        """
        # Split by double newlines (paragraph boundaries)
        raw_paragraphs = re.split(r"\n\s*\n", text)

        # Further split very long paragraphs at sentence boundaries
        paragraphs = []
        for para in raw_paragraphs:
            para = para.strip()
            if not para:
                continue

            if len(para) > 2000:
                # Split at sentence boundaries
                sentences = self._split_sentences(para)
                current = ""
                for sentence in sentences:
                    if len(current) + len(sentence) > 1500:
                        if current:
                            paragraphs.append(current.strip())
                        current = sentence
                    else:
                        current = current + " " + sentence if current else sentence
                if current:
                    paragraphs.append(current.strip())
            else:
                paragraphs.append(para)

        return [p for p in paragraphs if p.strip()]

    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences for fine-grained chunking."""
        # Legal sentence boundary detection
        # Handles abbreviations like "Sec.", "Art.", "vs.", "etc."
        sentence_pattern = re.compile(
            r"(?<!\b[A-Z][a-z])"  # Not after abbreviated title
            r"(?<!\bSec)"
            r"(?<!\bArt)"
            r"(?<!\bvs)"
            r"(?<!\betc)"
            r"[.!?]"
            r"(?:\s+|$)",
            re.MULTILINE,
        )

        sentences = []
        last_end = 0

        for match in sentence_pattern.finditer(text):
            end = match.end()
            sentence = text[last_end:end].strip()
            if sentence:
                sentences.append(sentence)
            last_end = end

        # Add any remaining text
        remaining = text[last_end:].strip()
        if remaining:
            sentences.append(remaining)

        return sentences if sentences else [text]

    def _build_chunks(
        self,
        paragraphs: List[str],
        chunk_size: int,
        chunk_overlap: int,
    ) -> List[str]:
        """
        Build overlapping chunks from paragraphs.
        Uses a sliding window with paragraph-aware boundaries.
        """
        chunks = []
        current_chunk = ""
        overlap_buffer = ""

        for para in paragraphs:
            # If a single paragraph exceeds chunk_size, split it
            if len(para) > chunk_size:
                # Flush current chunk first
                if current_chunk.strip():
                    chunks.append(current_chunk)
                    overlap_buffer = current_chunk[-chunk_overlap:] if len(current_chunk) > chunk_overlap else current_chunk
                    current_chunk = overlap_buffer

                # Split the large paragraph into sub-chunks
                words = para.split()
                temp = ""
                for word in words:
                    if len(temp) + len(word) + 1 > chunk_size:
                        if temp:
                            chunks.append(temp.strip())
                            # Overlap: take last N chars
                            overlap_start = max(0, len(temp) - chunk_overlap)
                            overlap_buffer = temp[overlap_start:]
                            temp = overlap_buffer + " " + word
                        else:
                            temp = word
                    else:
                        temp = temp + " " + word if temp else word

                if temp:
                    current_chunk = temp
                continue

            # Try to add paragraph to current chunk
            proposed = current_chunk + "\n\n" + para if current_chunk else para

            if len(proposed) <= chunk_size:
                current_chunk = proposed
            else:
                # Flush current chunk and start new one with overlap
                if current_chunk.strip():
                    chunks.append(current_chunk)
                    # Create overlap by taking the end of the current chunk
                    overlap_start = max(0, len(current_chunk) - chunk_overlap)
                    overlap_text = current_chunk[overlap_start:]
                    current_chunk = overlap_text + "\n\n" + para
                else:
                    current_chunk = para

        # Don't forget the last chunk
        if current_chunk.strip():
            chunks.append(current_chunk)

        return chunks

    def _estimate_page_number(self, chunk_index: int, total_chunks: int) -> Optional[int]:
        """Estimate page number based on chunk position (heuristic)."""
        if total_chunks == 0:
            return 1
        # Rough estimate: 3-4 chunks per page
        return max(1, chunk_index // 3 + 1)

    def extract_section_headers(self, text: str) -> List[str]:
        """
        Extract all section/clause headers from legal document text.
        Useful for document structure analysis.
        """
        headers = []
        for match in self._section_regex.finditer(text):
            header_line = text[match.start():text.find("\n", match.start())]
            headers.append(header_line.strip())
        return headers

    def count_tokens(self, text: str) -> int:
        """
        Estimate token count for LLM context management.
        Uses a rough 4-chars-per-token approximation.
        """
        return len(text) // 4

    def truncate_to_token_limit(self, text: str, max_tokens: int) -> str:
        """
        Truncate text to fit within a token limit.

        Args:
            text: Text to truncate
            max_tokens: Maximum token count

        Returns:
            Truncated text with ellipsis if truncated
        """
        max_chars = max_tokens * 4
        if len(text) <= max_chars:
            return text
        return text[:max_chars] + "\n\n[... Content truncated for length ...]"
