# LawBot — AI Corporate Legal Copilot

> Production-grade AI-powered Indian Corporate Law platform for startups, founders, SMEs, legal teams, and law firms.

---

## Overview

LawBot is a vertical AI legal-tech SaaS product that functions as an AI Legal Associate for Indian corporate law. It provides:

- **AI Legal Chat** — Ask complex questions about Indian corporate law with citation-backed answers
- **Contract Analysis** — Upload contracts to get risk scoring, clause-by-clause breakdown, missing clause detection
- **Document Generation** — Generate legally sound NDAs, Founder Agreements, Employment Contracts, and more
- **Compliance Tracking** — Stay on top of MCA, GST, SEBI, and ROC filings with deadline management
- **RAG-powered responses** — All AI answers backed by retrieved legal documents using BGE-M3 embeddings

---

## Project Structure

```
LawBot/
├── frontend/          # React 19 + TypeScript + Vite frontend
│   ├── src/
│   │   ├── api/       # API client functions
│   │   ├── components/ # Reusable UI components
│   │   ├── hooks/     # Custom React hooks
│   │   ├── pages/     # Page components
│   │   ├── stores/    # Zustand state stores
│   │   ├── types/     # TypeScript type definitions
│   │   └── lib/       # Utilities and API client
│   └── package.json
│
├── backend/           # FastAPI Python backend
│   ├── app/
│   │   ├── models/    # SQLAlchemy ORM models
│   │   ├── schemas/   # Pydantic request/response schemas
│   │   ├── routes/    # FastAPI route handlers
│   │   ├── services/  # Business logic layer
│   │   ├── repositories/ # Database access layer
│   │   ├── core/      # Auth, security, dependencies
│   │   ├── middleware/ # Rate limiting, auth middleware
│   │   └── utils/     # File handling, text processing
│   ├── alembic/       # Database migrations
│   ├── main.py        # FastAPI application entry point
│   └── requirements.txt
│
└── docker-compose.yml # Full stack Docker orchestration
```

---

## Tech Stack

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Styling | TailwindCSS + shadcn/ui |
| Animations | Framer Motion |
| 3D | Three.js + React Three Fiber + Drei |
| State | Zustand |
| Data Fetching | TanStack Query |
| Forms | React Hook Form + Zod |
| Routing | React Router v6 |
| Charts | Recharts |
| Notifications | Sonner |

### Backend
| Layer | Technology |
|-------|-----------|
| Framework | FastAPI |
| Language | Python 3.12+ |
| Database | PostgreSQL |
| ORM | SQLAlchemy (async) |
| Migrations | Alembic |
| Auth | JWT + bcrypt |
| Vector DB | Qdrant |
| AI Orchestration | LangGraph |
| Embeddings | BGE-M3 |
| Reranker | BGE Reranker |
| Document Processing | MinerU + PyMuPDF |
| Cache | Redis |
| Background Tasks | Celery |
| LLM Support | OpenAI / Anthropic Claude / Google Gemini / Ollama |

---

## Prerequisites

- Node.js 20+
- Python 3.12+
- Docker + Docker Compose
- PostgreSQL 16
- Redis 7
- Qdrant

---

## Quick Start

### 1. Clone & Setup

```bash
git clone <repo-url>
cd LawBot
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database credentials, API keys, etc.

# Run database migrations
alembic upgrade head

# Start development server
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local

# Start development server
npm run dev
```

### 4. Docker (Full Stack)

```bash
# From project root
docker-compose up -d
```

This starts:
- **PostgreSQL** on port 5432
- **Redis** on port 6379
- **Qdrant** on port 6333
- **Backend API** on port 8000
- **Frontend** on port 5173

---

## Environment Variables

### Backend `.env`

```env
# Database
DATABASE_URL=postgresql+asyncpg://lawbot:password@localhost:5432/lawbot

# Redis
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# AI/LLM
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
DEFAULT_LLM_PROVIDER=openai
DEFAULT_MODEL=gpt-4o

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=  # optional for local

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=50

# App
APP_NAME=LawBot
DEBUG=false
ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend `.env.local`

```env
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=LawBot
```

---

## API Documentation

Once the backend is running, interactive API docs are available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login and get JWT |
| GET | `/api/v1/auth/me` | Get current user |
| POST | `/api/v1/chat/conversations` | Create chat session |
| POST | `/api/v1/chat/conversations/{id}/messages` | Send message |
| GET | `/api/v1/chat/conversations/{id}/stream` | SSE streaming |
| POST | `/api/v1/documents/upload` | Upload document |
| POST | `/api/v1/contracts/analyze` | Analyze contract |
| GET | `/api/v1/generator/templates` | List document templates |
| POST | `/api/v1/generator/generate` | Generate legal document |
| GET | `/api/v1/compliance/dashboard` | Get compliance overview |

---

## AI Response Format

All AI legal responses follow a structured JSON format:

```json
{
  "answer": "Detailed legal analysis...",
  "risk_level": "HIGH",
  "confidence": 0.87,
  "sources": [
    {
      "document": "Companies Act 2013",
      "section": "Section 186",
      "excerpt": "..."
    }
  ],
  "referenced_clauses": ["Clause 4.1", "Clause 7.3"],
  "recommendations": [
    "Consult a qualified advocate before proceeding",
    "File Form MCA-21 within 30 days"
  ]
}
```

---

## Database Schema

Key tables:

- `users` — User accounts with type (founder/lawyer/sme/compliance)
- `documents` — Uploaded legal documents
- `document_chunks` — Text chunks stored in Qdrant
- `conversations` — Chat sessions
- `messages` — Individual messages with AI metadata
- `generated_documents` — AI-generated legal documents
- `compliance_events` — Compliance deadlines and events
- `audit_logs` — User action audit trail

---

## RAG Pipeline

```
Upload Document
      ↓
MinerU / PyMuPDF Extraction
      ↓
Text Cleaning & Preprocessing
      ↓
Semantic Chunking (512 tokens, 50 overlap)
      ↓
BGE-M3 Embeddings (dense + sparse)
      ↓
Store in Qdrant (hybrid vectors)
      ↓
[At Query Time]
      ↓
Hybrid Retrieval (semantic + keyword)
      ↓
BGE Reranker (top-k reranking)
      ↓
Context Assembly
      ↓
LawBot System Prompt + Context + Query → LLM
      ↓
Structured JSON Response
```

---

## Features

### Phase 1 (MVP — Current)

- [x] Authentication (JWT, register/login)
- [x] AI Legal Chat with streaming
- [x] Document upload (PDF/DOCX/TXT)
- [x] Contract analyzer with risk scoring
- [x] Legal document generator (NDA, Employment, Founder, Vendor)
- [x] Compliance dashboard (GST, MCA, ROC)
- [x] Dark futuristic UI with animations

### Phase 2 (Planned)

- [ ] Multi-document cross-analysis
- [ ] Legal research with web search
- [ ] Due diligence workflows
- [ ] Team collaboration
- [ ] E-signature integration
- [ ] WhatsApp/Slack integration

---

## Legal Disclaimer

LawBot is an AI-powered legal assistance tool. It is not a law firm and does not provide legal advice. All outputs should be reviewed by a qualified legal professional before reliance. LawBot specializes in Indian corporate law and compliance matters.

---

## License

Proprietary — LawBot Technologies Pvt. Ltd.
