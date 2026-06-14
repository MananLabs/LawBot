"""
Initial database schema migration for LawBot.
Creates all tables and relationships for the MVP.

Revision ID: 001_initial
Revises:
Create Date: 2024-06-15 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enums
    user_type_enum = postgresql.ENUM('founder', 'startup', 'lawyer', 'sme', 'admin', name='user_type_enum')
    subscription_tier_enum = postgresql.ENUM('free', 'starter', 'professional', 'enterprise', name='subscription_tier_enum')
    document_type_enum = postgresql.ENUM('pdf', 'docx', 'doc', 'txt', 'xlsx', 'xls', name='document_type_enum')
    document_status_enum = postgresql.ENUM('pending', 'processing', 'processed', 'failed', 'deleted', name='document_status_enum')
    message_role_enum = postgresql.ENUM('user', 'assistant', 'system', name='message_role_enum')
    risk_level_enum = postgresql.ENUM('low', 'medium', 'high', 'critical', 'none', 'info', name='risk_level_enum')
    generated_doc_type_enum = postgresql.ENUM(
        'nda', 'employment_agreement', 'founders_agreement', 'service_agreement', 'vendor_agreement',
        'shareholder_agreement', 'term_sheet', 'mou', 'privacy_policy', 'terms_of_service',
        'ip_assignment', 'consulting_agreement', 'lease_agreement', 'custom',
        name='generated_doc_type_enum'
    )
    generated_doc_status_enum = postgresql.ENUM('generating', 'completed', 'failed', name='generated_doc_status_enum')
    compliance_status_enum = postgresql.ENUM('upcoming', 'due_today', 'overdue', 'completed', 'waived', name='compliance_status_enum')
    compliance_priority_enum = postgresql.ENUM('low', 'medium', 'high', 'critical', name='compliance_priority_enum')
    compliance_category_enum = postgresql.ENUM(
        'roc_filing', 'gst', 'tds', 'income_tax', 'sebi', 'rbi', 'labour_law', 'startup_india',
        'msme', 'trademark', 'patent', 'fema', 'companies_act', 'other',
        name='compliance_category_enum'
    )

    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('user_type', user_type_enum, nullable=False, server_default='founder'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('subscription_tier', subscription_tier_enum, nullable=False, server_default='free'),
        sa.Column('company_name', sa.String(255), nullable=True),
        sa.Column('phone_number', sa.String(20), nullable=True),
        sa.Column('refresh_token', sa.String(512), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    op.create_index('ix_users_email', 'users', ['email'])

    # Create documents table
    op.create_table(
        'documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('filename', sa.String(500), nullable=False),
        sa.Column('original_filename', sa.String(500), nullable=False),
        sa.Column('file_path', sa.String(1000), nullable=False),
        sa.Column('file_type', document_type_enum, nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', document_status_enum, nullable=False, server_default='pending'),
        sa.Column('chunk_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('page_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('qdrant_collection', sa.String(255), nullable=True),
        sa.Column('content_hash', sa.String(64), nullable=True),
        sa.Column('extracted_text', sa.Text(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('error_message', sa.String(1000), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_documents_user_id', 'documents', ['user_id'])
    op.create_index('ix_documents_status', 'documents', ['status'])
    op.create_index('ix_documents_content_hash', 'documents', ['content_hash'])

    # Create conversations table
    op.create_table(
        'conversations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('title', sa.String(500), nullable=False, server_default='New Conversation'),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('message_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_conversations_user_id', 'conversations', ['user_id'])
    op.create_index('ix_conversations_document_id', 'conversations', ['document_id'])

    # Create messages table
    op.create_table(
        'messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', message_role_enum, nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('risk_level', risk_level_enum, nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('prompt_tokens', sa.Integer(), nullable=True),
        sa.Column('completion_tokens', sa.Integer(), nullable=True),
        sa.Column('llm_provider', sa.String(50), nullable=True),
        sa.Column('model_used', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_messages_conversation_id', 'messages', ['conversation_id'])

    # Create generated_documents table
    op.create_table(
        'generated_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('doc_type', generated_doc_type_enum, nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('status', generated_doc_status_enum, nullable=False, server_default='generating'),
        sa.Column('file_path', sa.String(1000), nullable=True),
        sa.Column('jurisdiction', sa.String(100), nullable=False, server_default='India'),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('error_message', sa.String(1000), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_generated_documents_user_id', 'generated_documents', ['user_id'])
    op.create_index('ix_generated_documents_doc_type', 'generated_documents', ['doc_type'])

    # Create compliance_events table
    op.create_table(
        'compliance_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', compliance_category_enum, nullable=False),
        sa.Column('regulation', sa.String(500), nullable=True),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', compliance_status_enum, nullable=False, server_default='upcoming'),
        sa.Column('priority', compliance_priority_enum, nullable=False, server_default='medium'),
        sa.Column('penalty_amount', sa.String(200), nullable=True),
        sa.Column('reminder_days', sa.Integer(), nullable=False, server_default='7'),
        sa.Column('is_recurring', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('recurrence_pattern', sa.String(100), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_compliance_events_user_id', 'compliance_events', ['user_id'])
    op.create_index('ix_compliance_events_category', 'compliance_events', ['category'])
    op.create_index('ix_compliance_events_due_date', 'compliance_events', ['due_date'])
    op.create_index('ix_compliance_events_status', 'compliance_events', ['status'])

    # Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('action', sa.String(200), nullable=False),
        sa.Column('resource_type', sa.String(100), nullable=True),
        sa.Column('resource_id', sa.String(100), nullable=True),
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='success'),
        sa.Column('error_message', sa.String(1000), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'])
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'])
    op.create_index('ix_audit_logs_resource_type', 'audit_logs', ['resource_type'])


def downgrade() -> None:
    # Drop all tables in reverse order
    op.drop_table('audit_logs')
    op.drop_table('compliance_events')
    op.drop_table('generated_documents')
    op.drop_table('messages')
    op.drop_table('conversations')
    op.drop_table('documents')
    op.drop_table('users')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS user_type_enum CASCADE')
    op.execute('DROP TYPE IF EXISTS subscription_tier_enum CASCADE')
    op.execute('DROP TYPE IF EXISTS document_type_enum CASCADE')
    op.execute('DROP TYPE IF EXISTS document_status_enum CASCADE')
    op.execute('DROP TYPE IF EXISTS message_role_enum CASCADE')
    op.execute('DROP TYPE IF EXISTS risk_level_enum CASCADE')
    op.execute('DROP TYPE IF EXISTS generated_doc_type_enum CASCADE')
    op.execute('DROP TYPE IF EXISTS generated_doc_status_enum CASCADE')
    op.execute('DROP TYPE IF EXISTS compliance_status_enum CASCADE')
    op.execute('DROP TYPE IF EXISTS compliance_priority_enum CASCADE')
    op.execute('DROP TYPE IF EXISTS compliance_category_enum CASCADE')
