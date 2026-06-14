// =====================================================================
// LAWBOT — COMPREHENSIVE TYPE DEFINITIONS
// =====================================================================

// =====================================================================
// UTILITY TYPES
// =====================================================================
export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type ID = string
export type ISODateString = string

export interface PaginatedResponse<T> {
  count: number
  next: Nullable<string>
  previous: Nullable<string>
  results: T[]
}

export interface ApiError {
  detail?: string
  message?: string
  error?: string
  errors?: Record<string, string[]>
  code?: string
}

// =====================================================================
// USER & AUTH
// =====================================================================
export type UserRole = 'admin' | 'attorney' | 'paralegal' | 'client'
export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'inactive'

export interface User {
  id: ID
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: UserRole
  avatar: Nullable<string>
  phone: Nullable<string>
  organization: Nullable<Organization>
  subscription: UserSubscription
  preferences: UserPreferences
  onboarding_completed: boolean
  email_verified: boolean
  created_at: ISODateString
  updated_at: ISODateString
  last_login: Nullable<ISODateString>
}

export interface Organization {
  id: ID
  name: string
  type: 'law_firm' | 'corporate' | 'startup' | 'individual'
  logo: Nullable<string>
  cin: Nullable<string>
  gstin: Nullable<string>
  pan: Nullable<string>
  address: Nullable<string>
  city: Nullable<string>
  state: Nullable<string>
  pincode: Nullable<string>
  members_count: number
  created_at: ISODateString
}

export interface UserSubscription {
  tier: SubscriptionTier
  status: SubscriptionStatus
  current_period_start: ISODateString
  current_period_end: ISODateString
  cancel_at_period_end: boolean
  usage: SubscriptionUsage
  limits: SubscriptionLimits
}

export interface SubscriptionUsage {
  chat_queries: number
  documents_analyzed: number
  contracts_generated: number
  storage_used_bytes: number
}

export interface SubscriptionLimits {
  chat_queries_per_month: number
  documents_per_month: number
  contracts_per_month: number
  storage_bytes: number
  team_members: number
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system'
  language: string
  notifications_email: boolean
  notifications_push: boolean
  default_jurisdiction: string
  compact_mode: boolean
}

// =====================================================================
// AUTH PAYLOADS
// =====================================================================
export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  first_name: string
  last_name: string
  organization_name?: string
  phone?: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface AuthResponse {
  user: User
  tokens: AuthTokens
}

export interface PasswordResetPayload {
  email: string
}

export interface PasswordResetConfirmPayload {
  uid: string
  token: string
  new_password: string
  confirm_password: string
}

export interface ChangePasswordPayload {
  old_password: string
  new_password: string
  confirm_password: string
}

// =====================================================================
// CHAT & MESSAGES
// =====================================================================
export type MessageRole = 'user' | 'assistant' | 'system'
export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error'
export type ChatSessionStatus = 'active' | 'archived'

export interface Message {
  id: ID
  session_id: ID
  role: MessageRole
  content: string
  status: MessageStatus
  metadata: MessageMetadata
  citations: Citation[]
  created_at: ISODateString
  updated_at: ISODateString
}

export interface MessageMetadata {
  model?: string
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  processing_time_ms?: number
  documents_referenced?: ID[]
  jurisdiction?: string
}

export interface Citation {
  id: ID
  document_id: Nullable<ID>
  document_name: Nullable<string>
  section: string
  text: string
  relevance_score: number
  url: Nullable<string>
  act_name: Nullable<string>
  section_number: Nullable<string>
}

export interface ChatSession {
  id: ID
  title: string
  status: ChatSessionStatus
  messages_count: number
  last_message: Nullable<string>
  last_message_at: Nullable<ISODateString>
  tags: string[]
  pinned: boolean
  created_at: ISODateString
  updated_at: ISODateString
}

export interface SendMessagePayload {
  session_id?: ID
  content: string
  document_ids?: ID[]
  stream?: boolean
  jurisdiction?: string
}

export interface SendMessageResponse {
  message: Message
  session: ChatSession
}

export interface CreateSessionPayload {
  title?: string
  initial_message?: string
}

// =====================================================================
// DOCUMENTS
// =====================================================================
export type DocumentType =
  | 'contract'
  | 'agreement'
  | 'mou'
  | 'nda'
  | 'service_agreement'
  | 'employment'
  | 'lease'
  | 'purchase_order'
  | 'loan_agreement'
  | 'shareholders_agreement'
  | 'articles_of_association'
  | 'memorandum'
  | 'legal_notice'
  | 'court_order'
  | 'compliance_report'
  | 'other'

export type DocumentStatus = 'processing' | 'ready' | 'error' | 'archived'

export interface Document {
  id: ID
  name: string
  original_filename: string
  type: DocumentType
  status: DocumentStatus
  file_size: number
  mime_type: string
  page_count: Nullable<number>
  language: string
  parties: DocumentParty[]
  summary: Nullable<string>
  key_clauses: KeyClause[]
  jurisdiction: Nullable<string>
  effective_date: Nullable<ISODateString>
  expiry_date: Nullable<ISODateString>
  tags: string[]
  is_analyzed: boolean
  upload_url: Nullable<string>
  created_at: ISODateString
  updated_at: ISODateString
}

export interface DocumentParty {
  name: string
  role: string
  type: 'individual' | 'company' | 'llp' | 'trust' | 'other'
  pan: Nullable<string>
  cin: Nullable<string>
  address: Nullable<string>
}

export interface KeyClause {
  id: ID
  title: string
  text: string
  type: string
  risk_level: 'high' | 'medium' | 'low'
  page_number: Nullable<number>
  notes: Nullable<string>
}

export interface DocumentUploadResponse {
  document: Document
  upload_url: string
  presigned_fields: Record<string, string>
}

export interface DocumentListParams {
  search?: string
  type?: DocumentType
  status?: DocumentStatus
  page?: number
  page_size?: number
  ordering?: string
  tags?: string[]
}

// =====================================================================
// CONTRACT ANALYSIS
// =====================================================================
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'none'
export type ClauseStatus = 'present' | 'missing' | 'ambiguous' | 'unfavorable'

export interface ContractAnalysis {
  id: ID
  document_id: ID
  document_name: string
  analysis_type: 'standard' | 'deep' | 'comparative'
  status: 'pending' | 'analyzing' | 'complete' | 'error'
  overall_risk_score: number // 0-100
  overall_risk_level: RiskLevel
  summary: string
  recommendations: string[]
  risk_flags: RiskFlag[]
  clause_analysis: ClauseAnalysis[]
  missing_clauses: MissingClause[]
  parties_analysis: PartyAnalysis[]
  financial_terms: FinancialTerms
  governing_law: Nullable<string>
  dispute_resolution: Nullable<DisputeResolution>
  compliance_issues: ComplianceIssue[]
  created_at: ISODateString
  completed_at: Nullable<ISODateString>
}

export interface RiskFlag {
  id: ID
  severity: RiskLevel
  category: string
  title: string
  description: string
  clause_text: Nullable<string>
  page_number: Nullable<number>
  recommendation: string
  legal_reference: Nullable<string>
}

export interface ClauseAnalysis {
  id: ID
  clause_type: string
  status: ClauseStatus
  title: string
  original_text: string
  analysis: string
  risk_level: RiskLevel
  suggestions: string[]
  alternative_language: Nullable<string>
}

export interface MissingClause {
  id: ID
  clause_type: string
  title: string
  importance: 'critical' | 'recommended' | 'optional'
  description: string
  suggested_text: string
  legal_basis: Nullable<string>
}

export interface PartyAnalysis {
  party_name: string
  role: string
  obligations: string[]
  rights: string[]
  liabilities: string[]
  risk_exposure: RiskLevel
}

export interface FinancialTerms {
  total_value: Nullable<number>
  currency: string
  payment_terms: Nullable<string>
  penalty_clauses: PenaltyClause[]
  tax_implications: string[]
  security_deposit: Nullable<number>
}

export interface PenaltyClause {
  trigger: string
  amount: Nullable<number>
  percentage: Nullable<number>
  description: string
}

export interface DisputeResolution {
  mechanism: 'arbitration' | 'mediation' | 'litigation' | 'negotiation'
  governing_law: string
  jurisdiction: string
  arbitration_rules: Nullable<string>
  seat_of_arbitration: Nullable<string>
}

export interface ComplianceIssue {
  id: ID
  act: string
  section: Nullable<string>
  issue_type: 'violation' | 'potential_violation' | 'recommendation'
  description: string
  penalty_risk: Nullable<string>
  remediation: string
}

export interface AnalyzeContractPayload {
  document_id: ID
  analysis_type?: 'standard' | 'deep' | 'comparative'
  comparison_document_ids?: ID[]
  focus_areas?: string[]
}

// =====================================================================
// DOCUMENT GENERATION
// =====================================================================
export type DocumentTemplate =
  | 'nda'
  | 'employment_agreement'
  | 'service_agreement'
  | 'founders_agreement'
  | 'shareholders_agreement'
  | 'term_sheet'
  | 'mou'
  | 'vendor_agreement'
  | 'consulting_agreement'
  | 'lease_agreement'
  | 'loan_agreement'
  | 'franchise_agreement'
  | 'partnership_deed'
  | 'software_license'
  | 'privacy_policy'
  | 'terms_of_service'

export interface DocumentTemplate_Info {
  id: DocumentTemplate
  name: string
  description: string
  category: string
  estimated_time: string
  acts_covered: string[]
  fields: TemplateField[]
  is_premium: boolean
}

export interface TemplateField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'date' | 'number' | 'select' | 'boolean' | 'party'
  required: boolean
  placeholder?: string
  options?: { label: string; value: string }[]
  description?: string
  max_length?: number
  min_value?: number
  max_value?: number
}

export interface GenerateDocumentPayload {
  template: DocumentTemplate
  fields: Record<string, unknown>
  jurisdiction?: string
  output_format?: 'docx' | 'pdf'
  custom_clauses?: CustomClause[]
}

export interface CustomClause {
  position: 'before' | 'after' | 'replace'
  section: string
  content: string
}

export interface GeneratedDocument {
  id: ID
  template: DocumentTemplate
  name: string
  status: 'generating' | 'complete' | 'error'
  download_url: Nullable<string>
  preview_url: Nullable<string>
  created_at: ISODateString
  completed_at: Nullable<ISODateString>
  word_count: Nullable<number>
  page_count: Nullable<number>
}

// =====================================================================
// COMPLIANCE
// =====================================================================
export type ComplianceFramework =
  | 'companies_act_2013'
  | 'sebi'
  | 'fema'
  | 'gst'
  | 'income_tax'
  | 'labour_laws'
  | 'ibc'
  | 'competition_act'
  | 'consumer_protection'
  | 'data_protection'
  | 'rbi_guidelines'
  | 'startup_india'

export type ComplianceStatus = 'compliant' | 'non_compliant' | 'needs_review' | 'not_applicable'
export type CompliancePriority = 'critical' | 'high' | 'medium' | 'low'

export interface ComplianceProfile {
  id: ID
  organization_id: ID
  company_type: CompanyType
  industry: string
  employees_count: number
  turnover_crores: Nullable<number>
  is_listed: boolean
  has_fdi: boolean
  frameworks: ComplianceFramework[]
  overall_score: number // 0-100
  last_assessed_at: Nullable<ISODateString>
  created_at: ISODateString
  updated_at: ISODateString
}

export type CompanyType =
  | 'private_limited'
  | 'public_limited'
  | 'llp'
  | 'one_person'
  | 'partnership'
  | 'sole_proprietorship'
  | 'section_8'

export interface ComplianceItem {
  id: ID
  framework: ComplianceFramework
  category: string
  title: string
  description: string
  status: ComplianceStatus
  priority: CompliancePriority
  due_date: Nullable<ISODateString>
  frequency: 'one_time' | 'monthly' | 'quarterly' | 'annual' | 'event_based'
  legal_reference: string
  penalty: Nullable<string>
  responsible_person: Nullable<string>
  documents_required: string[]
  action_items: ActionItem[]
  is_overdue: boolean
  completed_at: Nullable<ISODateString>
}

export interface ActionItem {
  id: ID
  title: string
  description: string
  completed: boolean
  due_date: Nullable<ISODateString>
}

export interface ComplianceCalendarEvent {
  id: ID
  title: string
  framework: ComplianceFramework
  due_date: ISODateString
  priority: CompliancePriority
  status: ComplianceStatus
  description: string
  recurring: boolean
  frequency: ComplianceItem['frequency']
}

export interface ComplianceDashboard {
  overall_score: number
  total_items: number
  compliant_count: number
  non_compliant_count: number
  needs_review_count: number
  overdue_count: number
  upcoming_deadlines: ComplianceCalendarEvent[]
  framework_breakdown: FrameworkBreakdown[]
  recent_updates: ComplianceUpdate[]
}

export interface FrameworkBreakdown {
  framework: ComplianceFramework
  framework_name: string
  score: number
  total: number
  compliant: number
  non_compliant: number
  needs_review: number
}

export interface ComplianceUpdate {
  id: ID
  type: 'new_regulation' | 'amendment' | 'deadline' | 'notification'
  title: string
  summary: string
  effective_date: ISODateString
  source: string
  frameworks: ComplianceFramework[]
  created_at: ISODateString
}

export interface ComplianceCheckPayload {
  company_type: CompanyType
  industry: string
  employees_count: number
  turnover_crores?: number
  is_listed?: boolean
  has_fdi?: boolean
  frameworks?: ComplianceFramework[]
}

// =====================================================================
// DASHBOARD
// =====================================================================
export interface DashboardStats {
  total_chats: number
  total_documents: number
  contracts_analyzed: number
  documents_generated: number
  compliance_score: number
  recent_activity: ActivityItem[]
  usage_this_month: SubscriptionUsage
  quick_insights: QuickInsight[]
}

export interface ActivityItem {
  id: ID
  type:
    | 'chat_started'
    | 'document_uploaded'
    | 'contract_analyzed'
    | 'document_generated'
    | 'compliance_checked'
  title: string
  description: string
  icon: string
  created_at: ISODateString
  metadata: Record<string, unknown>
}

export interface QuickInsight {
  id: ID
  category: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  action_url: Nullable<string>
  action_label: Nullable<string>
}

// =====================================================================
// UI STATE TYPES
// =====================================================================
export interface LoadingState {
  isLoading: boolean
  error: Nullable<string>
}

export interface ToastMessage {
  id: ID
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
  duration?: number
}

export interface Modal {
  id: string
  isOpen: boolean
  data?: unknown
}

export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  field: string
  direction: SortDirection
}

export interface FilterConfig {
  [key: string]: string | string[] | boolean | number | undefined
}

// =====================================================================
// SEARCH
// =====================================================================
export interface SearchResult {
  id: ID
  type: 'document' | 'chat' | 'contract' | 'clause'
  title: string
  excerpt: string
  score: number
  metadata: Record<string, unknown>
  url: string
}

export interface SearchResponse {
  query: string
  results: SearchResult[]
  total: number
  took_ms: number
}
