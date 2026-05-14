# Agentic AI

Agent backend using Python 3.12+ with uv package management.

## Project Structure

```
backend/
├── ai/                      # Agent tools module
│   ├── __init__.py
│   └── tools/
│       ├── __init__.py
│       ├── context.py       # Context management utilities
│       └── websearch.py     # Web search via Tavily API
├── app/                     # Application code
│   ├── db/                  # Database layer
│   ├── models/              # Data models
│   └── schemas/             # Pydantic schemas
├── test/                    # Tests
├── .venv/                   # Virtual environment
├── .ruff_cache/             # Ruff linter cache
├── .gitignore
├── .python-version
├── .env                     # Environment variables (TAVILY_API_KEY)
├── main.py                  # Application entry point
├── config.py                # Configuration handling
└── pyproject.toml           # Dependencies and metadata
```

## Dependencies

- `deepagents>=0.6.1` - Agent framework
- `tavily-python>=0.7.24` - Web search API client
- `dotenv>=0.9.9` - Environment variable management

## Development

```bash
cd backend
uv run python main.py          # Run application
uv run pytest                  # Run tests
uv add <package>              # Add dependency
```

## Environment

Requires `TAVILY_API_KEY` for web search functionality.
