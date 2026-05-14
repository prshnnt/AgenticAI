# Agentic AI

Agent backend using Python 3.12+ with uv package management.

## Project Structure

```
backend/
├── ai/                      # Agent logic
│   ├── agents/              # Agent definitions
│   ├── memory/              # Agent memory
│   ├── prompts/             # Agent prompts
│   ├── router/              # Router logic
│   ├── tools/               # Agent tools
│   │   ├── __init__.py
│   │   ├── context.py       # Context management utilities
│   │   └── websearch.py     # Web search via Tavily API
│   └── __init__.py
├── app/                     # Application code
│   ├── api/                 # API endpoints
│   ├── db/                  # Database layer
│   ├── models/              # Data models
│   └── schemas/             # Pydantic schemas
├── test/                    # Tests
├── utils/                   # Utility modules
│   └── logger.py            # Logging utility
├── .venv/                   # Virtual environment
├── .ruff_cache/             # Ruff linter cache
├── .python-version          # Python version
├── .env                     # Environment variables (TAVILY_API_KEY)
├── config.py                # Configuration handling
├── main.py                  # Application entry point
├── pyproject.toml           # Dependencies and metadata
├── requirements.txt         # Pinned dependencies
└── uv.lock                  # Lock file
```

## Dependencies

- `deepagents>=0.6.1` - Agent framework
- `dotenv>=0.9.9` - Environment variable management
- `fastapi>=0.136.1` - Web framework
- `pydantic-settings>=2.14.1` - Settings management
- `sqlalchemy>=2.0.49` - Database ORM
- `tavily-python>=0.7.24` - Web search API client

## Development

```bash
cd backend
uv run python main.py          # Run application
uv run pytest                  # Run tests
uv add <package>              # Add dependency
```

## Environment

Requires `TAVILY_API_KEY` for web search functionality.
