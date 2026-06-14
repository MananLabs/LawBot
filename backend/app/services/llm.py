"""
LLM Factory service with multi-provider support.
The LawBot system prompt is embedded here and used for all legal queries.
"""
import json
import re
from typing import Optional, AsyncGenerator, Dict, Any, List

import structlog

from app.config import settings

logger = structlog.get_logger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# LAWBOT SYSTEM PROMPT — embedded in all legal AI interactions
# ──────────────────────────────────────────────────────────────────────────────
LAWBOT_SYSTEM_PROMPT = """You are LawBot, an AI Corporate Legal Copilot specializing exclusively in Indian corporate, startup, compliance, contract, and commercial legal matters.

You are a specialized legal intelligence system built for founders, startups, SMEs, and legal teams operating within India.

## Core Expertise:
- Companies Act 2013 & related MCA regulations
- Startup India / DPIIT recognition and benefits
- SEBI regulations and capital markets law
- GST, Income Tax, and indirect taxation for businesses
- FEMA and cross-border transactions
- Employment & Labour laws (Shops & Establishments, PF, ESI, Gratuity)
- Contract law and Indian Contract Act 1872
- Intellectual Property (Patents, Trademarks, Copyrights)
- MSME regulations and benefits
- Data Protection (IT Act 2000, PDPB 2023)
- Arbitration and dispute resolution in India

## Response Format:
Always structure responses with these sections:
1. **Summary**: Brief overview of the legal matter (2-3 sentences)
2. **Legal Analysis**: Detailed legal analysis with relevant sections, acts, and case law
3. **Risks**: Identified legal risks with severity (LOW/MEDIUM/HIGH/CRITICAL)
4. **Recommendations**: Actionable steps and recommendations
5. **Confidence Level**: Your confidence in the analysis (0.0 to 1.0) and why
6. **Disclaimer**: Always include the standard legal disclaimer

## Contract Analysis Framework:
When analyzing contracts, always assess:
- Parties (identity, capacity, authority)
- Purpose & Scope (subject matter clarity)
- Term & Renewal (duration, auto-renewal clauses)
- Payment Terms (milestones, penalties, GST implications)
- Termination (for cause, convenience, notice periods)
- Confidentiality & NDA provisions
- Intellectual Property (ownership, license, assignment)
- Liability & Indemnification (caps, exclusions, mutual vs unilateral)
- Dispute Resolution (arbitration, jurisdiction, governing law)
- Governing Law (Indian law applicability, choice of law)
- Representations & Warranties
- Force Majeure

## Risk Scoring:
- LOW: Minor issues, standard market practice, easily negotiable
- MEDIUM: Significant terms requiring negotiation, potential financial/legal exposure
- HIGH: Serious risks, unusual terms, significant financial/reputational exposure
- CRITICAL: Deal-breaking risks, illegal terms, extreme liability exposure

## Output Format for Structured Responses:
When providing structured analysis, format your response as JSON with these keys:
{
  "answer": "Main response text",
  "summary": "Brief summary",
  "risk_level": "low|medium|high|critical|none",
  "confidence": 0.85,
  "recommendations": ["recommendation 1", "recommendation 2"],
  "referenced_clauses": [{"clause_type": "...", "clause_text": "...", "risk_level": "..."}],
  "disclaimer": "This response is for informational purposes only..."
}

## Professional Standards:
- Always maintain professional legal tone
- Be precise about which specific acts, sections, and rules apply
- Distinguish between settled law and evolving/unclear areas
- Flag when professional legal advice is strongly recommended
- Never provide advice on illegal activities
- Always consider the Indian legal context, not foreign law (unless specifically asked)

## Disclaimer (always include):
"This response is for informational purposes only and should not be considered legal advice. The information provided is based on general legal principles and may not account for recent changes in law or your specific circumstances. Please consult a qualified legal professional for specific legal matters."
"""

LAWBOT_CONTRACT_ANALYSIS_PROMPT = """You are analyzing a contract under Indian law. Provide a comprehensive analysis in the following JSON format:

{
  "contract_type": "Type of contract",
  "parties": [{"name": "...", "role": "...", "entity_type": "..."}],
  "term_duration": "...",
  "governing_law": "...",
  "risk_score": 0-100,
  "risk_level": "low|medium|high|critical",
  "overall_assessment": "...",
  "summary": "...",
  "high_risk_clauses": [
    {
      "clause_type": "...",
      "clause_text": "...",
      "section": "...",
      "risk_level": "HIGH",
      "risk_explanation": "...",
      "recommendation": "...",
      "is_standard": false
    }
  ],
  "medium_risk_clauses": [...],
  "low_risk_clauses": [...],
  "missing_clauses": [
    {
      "clause_type": "...",
      "clause_text": "This clause is missing",
      "risk_level": "HIGH",
      "risk_explanation": "Why this clause is important",
      "recommendation": "What to add",
      "is_missing": true
    }
  ],
  "key_findings": ["finding 1", "finding 2"],
  "red_flags": ["red flag 1"],
  "positive_aspects": ["positive 1"],
  "recommendations": ["recommendation 1"],
  "negotiation_points": ["point 1"],
  "compliance_issues": ["issue 1"],
  "indian_law_compliance": "Assessment of Indian law compliance",
  "confidence": 0.85
}
"""

LAWBOT_DOCUMENT_GENERATION_PROMPT = """You are generating a legal document for use in India. The document should:
1. Be compliant with Indian law (Companies Act, Contract Act, etc.)
2. Use proper legal language and formatting
3. Include all standard clauses for this document type
4. Be practical and enforceable in Indian courts
5. Include stamp duty and execution requirements as applicable

Generate a complete, professional legal document based on the provided parameters.
"""


class LLMService:
    """
    Multi-provider LLM service with LawBot system prompt.
    Supports OpenAI, Anthropic (Claude), and Google (Gemini).
    """

    def __init__(self, provider: Optional[str] = None) -> None:
        self.provider = provider or settings.default_llm_provider
        self._client = None

    def _get_openai_client(self):
        """Initialize OpenAI client."""
        from openai import AsyncOpenAI
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is not configured")
        return AsyncOpenAI(api_key=settings.openai_api_key)

    def _get_anthropic_client(self):
        """Initialize Anthropic client."""
        import anthropic
        if not settings.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY is not configured")
        return anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    def _get_google_client(self):
        """Initialize Google Gemini client."""
        import google.generativeai as genai
        if not settings.google_api_key:
            raise ValueError("GOOGLE_API_KEY is not configured")
        genai.configure(api_key=settings.google_api_key)
        return genai.GenerativeModel(settings.google_model)

    async def chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 4096,
        json_mode: bool = False,
    ) -> Dict[str, Any]:
        """
        Send a chat request to the configured LLM provider.

        Args:
            messages: List of {role, content} dicts
            system_prompt: Override system prompt (defaults to LAWBOT_SYSTEM_PROMPT)
            temperature: Sampling temperature (lower = more deterministic)
            max_tokens: Maximum response tokens
            json_mode: Whether to force JSON output

        Returns:
            Dict with 'content', 'provider', 'model', 'usage'
        """
        sys_prompt = system_prompt or LAWBOT_SYSTEM_PROMPT

        try:
            if self.provider == "openai":
                return await self._chat_openai(
                    messages, sys_prompt, temperature, max_tokens, json_mode
                )
            elif self.provider == "anthropic":
                return await self._chat_anthropic(
                    messages, sys_prompt, temperature, max_tokens
                )
            elif self.provider == "google":
                return await self._chat_google(
                    messages, sys_prompt, temperature, max_tokens
                )
            else:
                raise ValueError(f"Unsupported LLM provider: {self.provider}")
        except Exception as e:
            logger.error("LLM chat failed", provider=self.provider, error=str(e))
            raise

    async def _chat_openai(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        temperature: float,
        max_tokens: int,
        json_mode: bool,
    ) -> Dict[str, Any]:
        """Chat using OpenAI API."""
        client = self._get_openai_client()

        full_messages = [{"role": "system", "content": system_prompt}] + messages

        kwargs: Dict[str, Any] = {
            "model": settings.openai_model,
            "messages": full_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        response = await client.chat.completions.create(**kwargs)

        return {
            "content": response.choices[0].message.content,
            "provider": "openai",
            "model": settings.openai_model,
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens,
            },
        }

    async def _chat_anthropic(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> Dict[str, Any]:
        """Chat using Anthropic Claude API."""
        client = self._get_anthropic_client()

        # Convert messages to Anthropic format
        anthropic_messages = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "assistant"
            anthropic_messages.append({"role": role, "content": msg["content"]})

        response = await client.messages.create(
            model=settings.anthropic_model,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=anthropic_messages,
            temperature=temperature,
        )

        return {
            "content": response.content[0].text,
            "provider": "anthropic",
            "model": settings.anthropic_model,
            "usage": {
                "prompt_tokens": response.usage.input_tokens,
                "completion_tokens": response.usage.output_tokens,
                "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
            },
        }

    async def _chat_google(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> Dict[str, Any]:
        """Chat using Google Gemini API."""
        import google.generativeai as genai
        genai.configure(api_key=settings.google_api_key)

        model = genai.GenerativeModel(
            model_name=settings.google_model,
            system_instruction=system_prompt,
        )

        # Build conversation history
        history = []
        for msg in messages[:-1]:
            role = "user" if msg["role"] == "user" else "model"
            history.append({"role": role, "parts": [msg["content"]]})

        chat = model.start_chat(history=history)

        generation_config = genai.types.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
        )

        last_message = messages[-1]["content"] if messages else ""
        response = await chat.send_message_async(
            last_message,
            generation_config=generation_config,
        )

        return {
            "content": response.text,
            "provider": "google",
            "model": settings.google_model,
            "usage": {
                "prompt_tokens": response.usage_metadata.prompt_token_count,
                "completion_tokens": response.usage_metadata.candidates_token_count,
                "total_tokens": response.usage_metadata.total_token_count,
            },
        }

    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[str, None]:
        """
        Stream a chat response token by token.

        Yields:
            String chunks of the response
        """
        sys_prompt = system_prompt or LAWBOT_SYSTEM_PROMPT

        if self.provider == "openai":
            async for chunk in self._stream_openai(messages, sys_prompt, temperature, max_tokens):
                yield chunk
        elif self.provider == "anthropic":
            async for chunk in self._stream_anthropic(messages, sys_prompt, temperature, max_tokens):
                yield chunk
        elif self.provider == "google":
            async for chunk in self._stream_google(messages, sys_prompt, temperature, max_tokens):
                yield chunk
        else:
            raise ValueError(f"Streaming not supported for provider: {self.provider}")

    async def _stream_openai(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> AsyncGenerator[str, None]:
        """Stream using OpenAI API."""
        client = self._get_openai_client()
        full_messages = [{"role": "system", "content": system_prompt}] + messages

        stream = await client.chat.completions.create(
            model=settings.openai_model,
            messages=full_messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices[0].delta.content is not None:
                yield chunk.choices[0].delta.content

    async def _stream_anthropic(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> AsyncGenerator[str, None]:
        """Stream using Anthropic Claude API."""
        client = self._get_anthropic_client()

        anthropic_messages = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "assistant"
            anthropic_messages.append({"role": role, "content": msg["content"]})

        async with client.messages.stream(
            model=settings.anthropic_model,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=anthropic_messages,
            temperature=temperature,
        ) as stream:
            async for text in stream.text_stream:
                yield text

    async def _stream_google(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> AsyncGenerator[str, None]:
        """Stream using Google Gemini API."""
        import google.generativeai as genai
        genai.configure(api_key=settings.google_api_key)

        model = genai.GenerativeModel(
            model_name=settings.google_model,
            system_instruction=system_prompt,
        )

        history = []
        for msg in messages[:-1]:
            role = "user" if msg["role"] == "user" else "model"
            history.append({"role": role, "parts": [msg["content"]]})

        chat = model.start_chat(history=history)
        last_message = messages[-1]["content"] if messages else ""

        generation_config = genai.types.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
        )

        response = await chat.send_message_async(
            last_message,
            generation_config=generation_config,
            stream=True,
        )

        async for chunk in response:
            if chunk.text:
                yield chunk.text

    def parse_json_response(self, content: str) -> Dict[str, Any]:
        """
        Parse JSON from LLM response, handling markdown code blocks.
        Falls back to empty dict on parse failure.
        """
        # Try to extract JSON from markdown code blocks
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", content)
        if json_match:
            content = json_match.group(1)

        # Try to find a JSON object directly
        json_obj_match = re.search(r"\{[\s\S]*\}", content)
        if json_obj_match:
            content = json_obj_match.group(0)

        try:
            return json.loads(content)
        except json.JSONDecodeError:
            logger.warning("Failed to parse JSON from LLM response")
            return {"answer": content, "error": "Could not parse structured response"}


def get_llm_service(provider: Optional[str] = None) -> LLMService:
    """Factory function to get an LLM service instance."""
    return LLMService(provider=provider or settings.default_llm_provider)
