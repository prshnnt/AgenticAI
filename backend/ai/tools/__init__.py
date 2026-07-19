from .websearch import websearch


def get_tools():
    # Main agent gets no tools. Web search is delegated to the
    # `researcher` subagent to keep the main context lean.
    # Add agent-wide tools here when needed.
    return []


__all__ = ["get_tools", "websearch"]