# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Agentic AI system: FastAPI backend + React/Vite frontend. PostgreSQL for relational history, Redis for LangGraph checkpoints, Ollama for LLM inference, Tavily for web search.

**Request flow (chat message):**
1. Client POSTs to `/chats/threads/{id}` (FastAPI, `backend/app/api/chats.py`)
2. `AgentTaskManager` creates/overwrites a background `asyncio.Task` running `DeepAgentService.stream` (`backend/ai/agents/agent.py`)
3. LangGraph deepagent executes via `astream_events`, yielding `StreamChunk` events (start / content / tool_name / tool_output / end / error) into per-client `asyncio.Queue`s
4. SSE stream emits chunks to the browser. Final AI response persisted via `MessageService.create_message`.

**Key modules:**
- `backend/main.py` — FastAPI app, CORS, router wiring, startup DB init
- `backend/config.py` — `pydantic-settings` Settings (loads `.env`)
- `backend/ai/agents/agent.py` — `DeepAgentService`: builds the deepagent graph (model + tools + subagents + system prompt + Redis checkpointer), streams events, persists final message
- `backend/ai/agents/subagents/researcher.py` — Researcher subagent; uses Tavily tool, has its own system prompt, delegates to keep main context lean
- `backend/ai/tools/websearch.py` — `@tool` wrapping `TavilyClient.search`
- `backend/ai/tools/__init__.py` — `get_tools()` registry pattern (add new tools here)
- `backend/ai/skills/` — Agent skills (long-running tools with their own system prompt). `pdf_skill.py` exposes `html_to_pdf` (`@tool`) using WeasyPrint to render agent-authored HTML into a real PDF under `backend/generated_pdfs/`. Each skill is paired with a `*_SKILL_SYSTEM_PROMPT` const intended to be inlined into the main agent prompt.
- `backend/ai/prompts/SYSTEM_PROMPT.py` — System prompt module (note: `.py` not `.md`; loaded with try/except fallback)
- `backend/app/api/auth.py` — JWT login/register (`/auth/*`)
- `backend/app/api/chats.py` — Thread CRUD + SSE streaming + `AgentTaskManager`
- `backend/app/api/dependencies.py` — `get_current_user` JWT dep
- `backend/app/core/auth.py` — bcrypt password hashing, JWT encode/decode
- `backend/app/database/` — SQLAlchemy: `models.py` (User), `session.py` (engine + `get_db` / `get_db_context`), `services.py` (`ThreadService`, `MessageService`)
- `backend/ai/database/models.py` — `ChatThread`, `ChatMessage` (separate from app User model)
- `backend/init_db.py` — Creates tables, seeds demo user (`demo` / `demo123`)
- `backend/utils/logger.py` — Shared logger
- `frontend/src/` — React 19 + Vite 8. Components: `ChatWindow`, `MessageBubble`, `InputBar`, `Sidebar`, `ToolsPicker`, `WelcomeScreen`, `LoginPage`. Vite dev server proxies `/auth` → `http://localhost:8000`

**Conventions:**
- Backend uses two DB schemas: `app.database.models.User` (auth) and `ai.database.models` (chats). Don't merge.
- Tool registration is a registry pattern: implement in `ai/tools/`, export via `ai/tools/__init__.py:get_tools()`.
- Subagent registration: implement in `ai/agents/subagents/`, export via `ai/agents/subagents/__init__.py:get_subagents()`.
- Skill registration (long-running tools + their own prompt fragment): add a module to `ai/skills/`. Define the `@tool` and a `*_SKILL_SYSTEM_PROMPT` const in the same file; merge the prompt into `SYSTEM_PROMPT.py` and re-export the tool from a registry helper (mirror the `get_tools()` / `get_subagents()` pattern).
- `StreamChunk` (Pydantic) is the SSE event schema in `backend/app/schemas/chats.py`.
- Thread ID is stringified in LangGraph config (`{"configurable": {"thread_id": str(thread.id)}}`).
- Background task cancellation: `start_task` cancels any prior task for the same thread_id before starting a new one.

## Development

**Backend (Python 3.12+, `uv`):**
```bash
cd backend
uv venv                              # one-time
uv pip sync uv.lock                  # install from lock
uv run python init_db.py             # create tables + seed demo user
uv run python main.py                # FastAPI on :8000 (or uvicorn main:app --reload)
uv run pytest                        # tests
uv add <pkg>                         # add dependency (updates uv.lock)
```

Windows convenience wrappers at repo root: `backend.bat` (pass `reload` for hot-reload), `frontend.bat`.

**Frontend (Node 18+, npm):**
```bash
cd frontend
npm install
npm run dev      # Vite dev server
npm run build    # production build → dist/
npm run lint     # ESLint
npm run preview  # serve built output
```

**Docker (full stack with Postgres):**
```bash
docker compose up --build
# Postgres :5432, backend :8000, frontend :80
```

**Run a single test:**
```bash
cd backend
uv run pytest tests/test_<file>.py::test_<name> -v
```

## Environment

`backend/.env` (see `backend/config.py` for full schema):
- `DATABASE_URL` — PostgreSQL DSN
- `REDIS_URI` — Redis for LangGraph checkpoints (default `redis://localhost:6379`)
- `TAVILY_API_KEY` — Web search (required)
- `GOOGLE_API_KEY` — Gemini
- `GROQ_API_KEY` — Groq
- `OLLAMA_BASE_URL`, `OLLAMA_API_KEY` — Ollama endpoint
- `REDIS_API_KEY_AGENT_MEMORY` — Secure Redis option
- `SECRET_KEY` — JWT signing (change in prod)
- `CORS_ORIGINS` — list

Frontend env: `VITE_API_URL` (build arg in `docker-compose.yml`).

## Notes

- `DeepAgentService` calls `await self.checkpointer.asetup()` lazily on first stream — requires Redis to be reachable.
- `astream_events(..., version="v2")` is the event API; event types handled: `on_chat_model_stream`, `on_tool_start`, `on_tool_end`, `on_chat_model_end`, `on_chat_model_error`.
- `messages` payload uses LangChain `HumanMessage`; full response is accumulated in `full_response` and persisted as `MessageRole.AI` at stream end.
- 300-second timeout per stream via `asyncio.timeout(300)`.
- Default LLM is `ChatOllama` with `temperature=0`; subagents reference the same model via `f"ollama:{settings.ollama_model}"` string.
- `allowed_tools` filter on `DeepAgentService.stream` rebuilds the graph with a reduced toolset; main agent instance (`self.agent`) only used when no filter is applied.
- `StreamChunk.type` values: `start | content | tool_name | tool_output | end | error`. `error` is yielded both on model error and on outer stream exception.
