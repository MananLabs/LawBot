"""
API route handlers for LawBot.
"""
from app.routes import auth, chat, documents, contracts, generator, compliance, export

__all__ = ["auth", "chat", "documents", "contracts", "generator", "compliance", "export"]
