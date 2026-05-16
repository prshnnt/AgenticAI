# Agentic AI

An agentic AI backend built with Python 3.12+ using uv package management and FastAPI.

## Features

- Web search via Tavily API
- Context management utilities
- Authentication with bcrypt
- Frontend React Vite app with proxy to backend

## Development

```bash
cd backend
uv run python main.py          # Run application
uv run pytest                  # Run tests (configure when tests exist)
uv add <package>              # Add dependency
```

## Environment

Requires `TAVILY_API_KEY` environment variable for web search functionality.

## License

MIT