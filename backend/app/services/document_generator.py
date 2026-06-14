"""
Legal document generation service for Indian corporate law documents.
Uses LLM to generate complete, jurisdiction-compliant legal documents.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.generated_document import GeneratedDocType, GeneratedDocStatus
from app.models.user import User
from app.repositories.base import BaseRepository
from app.schemas.generator import (
    DocumentGenerationRequest,
    DocumentGenerationResponse,
    DocumentTemplate,
)
from app.services.llm import LLMService, LAWBOT_DOCUMENT_GENERATION_PROMPT, get_llm_service

logger = structlog.get_logger(__name__)

# Templates for each document type
DOCUMENT_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "nda": {
        "name": "Non-Disclosure Agreement (NDA)",
        "description": "Mutual or one-way NDA for business discussions, partnerships, or employment",
        "required_fields": ["parties", "purpose"],
        "optional_fields": ["term", "jurisdiction", "special_conditions"],
        "tags": ["confidentiality", "startup", "partnership"],
    },
    "employment_agreement": {
        "name": "Employment Agreement",
        "description": "Comprehensive employment contract compliant with Indian labour laws",
        "required_fields": ["parties", "company_name", "purpose"],
        "optional_fields": ["term", "payment_amount", "special_conditions"],
        "tags": ["employment", "HR", "labour law"],
    },
    "founders_agreement": {
        "name": "Founders' Agreement",
        "description": "Equity split, roles, vesting, and IP assignment for co-founders",
        "required_fields": ["parties", "company_name"],
        "optional_fields": ["special_conditions"],
        "tags": ["startup", "equity", "co-founders"],
    },
    "service_agreement": {
        "name": "Service Agreement",
        "description": "Professional services agreement between company and service provider",
        "required_fields": ["parties", "purpose", "payment_amount"],
        "optional_fields": ["term", "jurisdiction", "special_conditions"],
        "tags": ["services", "vendor", "B2B"],
    },
    "shareholder_agreement": {
        "name": "Shareholders' Agreement (SHA)",
        "description": "Rights and obligations of shareholders in a private limited company",
        "required_fields": ["parties", "company_name"],
        "optional_fields": ["jurisdiction", "special_conditions"],
        "tags": ["investment", "equity", "governance"],
    },
    "term_sheet": {
        "name": "Term Sheet",
        "description": "Investment term sheet for seed/angel/venture capital rounds",
        "required_fields": ["parties", "company_name", "payment_amount"],
        "optional_fields": ["special_conditions"],
        "tags": ["investment", "funding", "VC"],
    },
    "vendor_agreement": {
        "name": "Vendor/Supplier Agreement",
        "description": "Agreement with vendors for goods supply under Indian law",
        "required_fields": ["parties", "purpose", "payment_amount"],
        "optional_fields": ["term", "special_conditions"],
        "tags": ["vendor", "supply", "procurement"],
    },
    "mou": {
        "name": "Memorandum of Understanding (MoU)",
        "description": "Non-binding or binding MoU for business collaborations",
        "required_fields": ["parties", "purpose"],
        "optional_fields": ["term", "jurisdiction"],
        "tags": ["collaboration", "partnership", "B2B"],
    },
    "privacy_policy": {
        "name": "Privacy Policy",
        "description": "PDPB-compliant privacy policy for Indian websites and apps",
        "required_fields": ["company_name"],
        "optional_fields": ["special_conditions"],
        "tags": ["legal", "compliance", "data protection"],
    },
    "terms_of_service": {
        "name": "Terms of Service",
        "description": "Website/app terms of service under Indian IT Act",
        "required_fields": ["company_name"],
        "optional_fields": ["special_conditions"],
        "tags": ["legal", "compliance", "IT Act"],
    },
    "ip_assignment": {
        "name": "IP Assignment Agreement",
        "description": "Assignment of intellectual property rights to a company",
        "required_fields": ["parties", "company_name", "purpose"],
        "optional_fields": ["payment_amount", "special_conditions"],
        "tags": ["IP", "patent", "trademark", "copyright"],
    },
    "consulting_agreement": {
        "name": "Consulting Agreement",
        "description": "Agreement for independent consultant engagement",
        "required_fields": ["parties", "purpose", "payment_amount"],
        "optional_fields": ["term", "special_conditions"],
        "tags": ["consulting", "freelance", "services"],
    },
}


class DocumentGeneratorService:
    """
    Service for AI-powered generation of Indian legal documents.
    Generates complete, jurisdiction-compliant legal documents using LLM.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def generate_document(
        self,
        request: DocumentGenerationRequest,
        user: User,
        llm_provider: Optional[str] = None,
    ) -> DocumentGenerationResponse:
        """
        Generate a complete legal document based on the request parameters.

        Args:
            request: Document generation parameters
            user: Authenticated user
            llm_provider: Optional LLM provider override

        Returns:
            DocumentGenerationResponse with generated content
        """
        from app.models.generated_document import GeneratedDocument

        # Determine title
        title = request.title or self._get_default_title(request)

        # Create initial record with GENERATING status
        doc_data = {
            "user_id": user.id,
            "doc_type": request.doc_type,
            "title": title,
            "status": GeneratedDocStatus.GENERATING,
            "jurisdiction": request.jurisdiction,
            "gen_metadata": request.model_dump(exclude_none=True),
        }

        # Use a simple repository
        from sqlalchemy import insert
        from app.models.generated_document import GeneratedDocument as GenDocModel

        gen_doc = GenDocModel(**doc_data)
        self.db.add(gen_doc)
        await self.db.flush()
        await self.db.refresh(gen_doc)

        try:
            # Generate the document
            content = await self._generate_with_llm(request, llm_provider)

            # Update with generated content
            gen_doc.content = content
            gen_doc.status = GeneratedDocStatus.COMPLETED
            self.db.add(gen_doc)
            await self.db.flush()
            await self.db.refresh(gen_doc)

            logger.info(
                "Document generated successfully",
                doc_id=str(gen_doc.id),
                doc_type=request.doc_type.value,
                user_id=str(user.id),
            )

        except Exception as e:
            logger.error("Document generation failed", error=str(e), exc_info=True)
            gen_doc.status = GeneratedDocStatus.FAILED
            gen_doc.error_message = str(e)[:500]
            self.db.add(gen_doc)
            await self.db.flush()

        return DocumentGenerationResponse(
            id=gen_doc.id,
            user_id=gen_doc.user_id,
            doc_type=gen_doc.doc_type,
            title=gen_doc.title,
            status=gen_doc.status,
            content=gen_doc.content,
            file_path=gen_doc.file_path,
            jurisdiction=gen_doc.jurisdiction,
            metadata=gen_doc.gen_metadata,
            error_message=gen_doc.error_message,
            created_at=gen_doc.created_at,
            updated_at=gen_doc.updated_at,
        )

    async def _generate_with_llm(
        self,
        request: DocumentGenerationRequest,
        llm_provider: Optional[str] = None,
    ) -> str:
        """Generate document content using LLM."""
        llm = get_llm_service(provider=llm_provider or settings.default_llm_provider)

        # Build comprehensive generation prompt
        prompt = self._build_generation_prompt(request)

        response = await llm.chat(
            messages=[{"role": "user", "content": prompt}],
            system_prompt=LAWBOT_DOCUMENT_GENERATION_PROMPT,
            temperature=0.2,
            max_tokens=8000,
            json_mode=False,
        )

        content = response.get("content", "")

        if not content or len(content) < 100:
            raise ValueError("LLM returned insufficient content for document generation")

        return content

    def _build_generation_prompt(self, request: DocumentGenerationRequest) -> str:
        """Build the generation prompt from request parameters."""
        doc_type_name = request.doc_type.value.replace("_", " ").title()

        # Build parties section
        parties_text = ""
        if request.parties:
            parties_info = []
            for p in request.parties:
                party_str = f"- {p.name} ({p.role})"
                if p.entity_type:
                    party_str += f", a {p.entity_type}"
                if p.address:
                    party_str += f", located at {p.address}"
                if p.registration_number:
                    party_str += f", Registration No.: {p.registration_number}"
                parties_info.append(party_str)
            parties_text = "PARTIES:\n" + "\n".join(parties_info)
        elif request.company_name:
            parties_text = f"PARTY: {request.company_name}"

        # Build agreement details
        details = []
        if request.purpose:
            details.append(f"PURPOSE: {request.purpose}")
        if request.term:
            details.append(f"AGREEMENT TERM: {request.term}")
        if request.start_date:
            details.append(f"START DATE: {request.start_date}")
        if request.end_date:
            details.append(f"END DATE: {request.end_date}")
        if request.payment_amount:
            details.append(f"PAYMENT/CONSIDERATION: {request.payment_amount} {request.currency}")
        if request.payment_schedule:
            details.append(f"PAYMENT SCHEDULE: {request.payment_schedule}")
        if request.dispute_resolution:
            details.append(f"DISPUTE RESOLUTION: {request.dispute_resolution}")
        if request.arbitration_city:
            details.append(f"ARBITRATION SEAT: {request.arbitration_city}")

        # Special conditions
        special_conditions_text = ""
        if request.special_conditions:
            special_conditions_text = "\nSPECIAL CONDITIONS:\n" + "\n".join(
                f"- {cond}" for cond in request.special_conditions
            )

        if request.custom_clauses:
            special_conditions_text += "\nCUSTOM CLAUSES TO INCLUDE:\n" + "\n".join(
                f"- {clause}" for clause in request.custom_clauses
            )

        # IP and NDA flags
        ip_note = ""
        if request.include_ip_assignment:
            ip_owner = request.ip_owner or (request.parties[0].name if request.parties else request.company_name or "Company")
            ip_note = f"\nINTELLECTUAL PROPERTY: Include IP assignment clause assigning all IP to {ip_owner}"
        if request.include_nda:
            ip_note += "\nCONFIDENTIALITY: Include a strong mutual NDA/confidentiality clause"

        additional = ""
        if request.additional_context:
            additional = f"\nADDITIONAL CONTEXT: {request.additional_context}"

        prompt = f"""Generate a complete, professional {doc_type_name} for use in India.

JURISDICTION: {request.jurisdiction}
DOCUMENT TYPE: {doc_type_name}

{parties_text}

{"".join(f"{d}" + chr(10) for d in details)}
{special_conditions_text}
{ip_note}
{additional}

REQUIREMENTS:
1. Generate a COMPLETE, ready-to-sign legal document
2. Include all standard clauses for this document type under Indian law
3. Use professional legal language and proper formatting
4. Include recitals/whereas clauses
5. Include proper definitions section
6. Include all operative clauses with clear headings
7. Include signature blocks with date and witness provisions
8. Specify applicable Indian law (Companies Act 2013, Contract Act 1872, etc. as relevant)
9. Include stamp duty notice appropriate for {request.jurisdiction}
10. Do NOT include any [PLACEHOLDER] text - generate actual content
11. Format: Use proper legal numbering (1., 1.1, 1.2, etc.)

Generate the complete document now:"""

        return prompt

    def _get_default_title(self, request: DocumentGenerationRequest) -> str:
        """Generate a default title for the document."""
        doc_name = request.doc_type.value.replace("_", " ").title()
        if request.company_name:
            return f"{doc_name} - {request.company_name}"
        if request.parties and len(request.parties) >= 2:
            return f"{doc_name} - {request.parties[0].name} & {request.parties[1].name}"
        return f"{doc_name} - {datetime.now(timezone.utc).strftime('%Y-%m-%d')}"

    def get_available_templates(self) -> list[DocumentTemplate]:
        """Return all available document templates."""
        templates = []
        for doc_type_str, template_data in DOCUMENT_TEMPLATES.items():
            try:
                doc_type = GeneratedDocType(doc_type_str)
                templates.append(DocumentTemplate(
                    template_id=doc_type_str,
                    doc_type=doc_type,
                    name=template_data["name"],
                    description=template_data["description"],
                    jurisdiction="India",
                    required_fields=template_data.get("required_fields", []),
                    optional_fields=template_data.get("optional_fields", []),
                    tags=template_data.get("tags", []),
                ))
            except ValueError:
                continue
        return templates
