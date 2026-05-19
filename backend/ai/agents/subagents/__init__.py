from ai.tools import websearch

research_subagent = {
    "name": "research-agent",
    "description": "Used to research more in depth questions",
    "system_prompt": "You are a great researcher",
    "tools": [websearch],
    "model": "google_genai:gemini-3.1-pro-preview",  # Optional override, defaults to main agent model
}