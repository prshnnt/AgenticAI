import json
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional
import redis.asyncio as aioredis
from langchain_core.runnables import RunnableConfig
from langchain.tools import tool
from config import settings

logger = logging.getLogger(__name__)

REDIS_KEY_PREFIX = "agentic_ai:scratchpad:"

async def get_redis_connection() -> aioredis.Redis:
    """Helper function to get an async Redis client."""
    return aioredis.from_url(settings.REDIS_URI, decode_responses=True)

async def _get_scratchpad_data(client: aioredis.Redis, thread_id: str) -> dict:
    """Helper to retrieve scratchpad data from Redis."""
    key = f"{REDIS_KEY_PREFIX}{thread_id}"
    raw = await client.get(key)
    if raw:
        try:
            return json.loads(raw)
        except Exception as e:
            logger.error(f"Error parsing scratchpad JSON for thread {thread_id}: {e}")
    return {"todos": [], "notes": ""}

async def _save_scratchpad_data(client: aioredis.Redis, thread_id: str, data: dict):
    """Helper to save scratchpad data to Redis."""
    key = f"{REDIS_KEY_PREFIX}{thread_id}"
    await client.set(key, json.dumps(data))

@tool
async def scratchpad_view(config: RunnableConfig) -> str:
    """
    View the AI scratchpad for the current chat session.
    Returns the general notes and the todo list with statuses.
    Use this to see what tasks are left, what has been completed, and retrieve context/guidance notes.
    """
    thread_id = config.get("configurable", {}).get("thread_id")
    if not thread_id:
        return "Error: No active thread_id found in config. Cannot view scratchpad."

    async with await get_redis_connection() as r:
        data = await _get_scratchpad_data(r, thread_id)
        
        # Format output
        todos = data.get("todos", [])
        notes = data.get("notes", "")
        
        output = "=== AI SCRATCHPAD ===\n"
        output += f"Notes:\n{notes if notes else '(No notes written yet)'}\n\n"
        output += "Todo List:\n"
        if not todos:
            output += "  (No tasks in the todo list)"
        else:
            for item in todos:
                status = "[x]" if item.get("completed") else "[ ]"
                output += f"  - {status} ID: {item.get('id')} | {item.get('text')}\n"
        output += "\n====================="
        return output

@tool
async def scratchpad_add_todo(text: str, config: RunnableConfig) -> str:
    """
    Add a new task to the AI todo list for the current chat session.
    Ensure text clearly describes what needs to be done.
    """
    thread_id = config.get("configurable", {}).get("thread_id")
    if not thread_id:
        return "Error: No active thread_id found in config. Cannot add todo."

    async with await get_redis_connection() as r:
        data = await _get_scratchpad_data(r, thread_id)
        
        new_todo = {
            "id": str(uuid.uuid4())[:8],  # short UUID for readability
            "text": text,
            "completed": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None
        }
        data.setdefault("todos", []).append(new_todo)
        await _save_scratchpad_data(r, thread_id, data)
        return f"Successfully added task: '{text}' with ID {new_todo['id']}"

@tool
async def scratchpad_update_todo(
    todo_id: str,
    text: Optional[str] = None,
    completed: Optional[bool] = None,
    config: RunnableConfig = None
) -> str:
    """
    Update an existing task in the todo list by its ID.
    You can change the task description (text) or toggle its completion status (completed = True/False).
    """
    thread_id = config.get("configurable", {}).get("thread_id")
    if not thread_id:
        return "Error: No active thread_id found in config. Cannot update todo."

    async with await get_redis_connection() as r:
        data = await _get_scratchpad_data(r, thread_id)
        todos = data.get("todos", [])
        
        found = False
        for item in todos:
            if item.get("id") == todo_id:
                found = True
                if text is not None:
                    item["text"] = text
                if completed is not None:
                    prev_completed = item.get("completed", False)
                    item["completed"] = completed
                    if completed and not prev_completed:
                        item["completed_at"] = datetime.now(timezone.utc).isoformat()
                    elif not completed:
                        item["completed_at"] = None
                break
        
        if not found:
            return f"Error: Task with ID '{todo_id}' not found in the todo list."
        
        await _save_scratchpad_data(r, thread_id, data)
        return f"Successfully updated task '{todo_id}'."

@tool
async def scratchpad_delete_todo(todo_id: str, config: RunnableConfig) -> str:
    """
    Delete a task from the AI todo list for the current chat session by its ID.
    Use this when a task is no longer relevant or was added in error.
    """
    thread_id = config.get("configurable", {}).get("thread_id")
    if not thread_id:
        return "Error: No active thread_id found in config. Cannot delete todo."

    async with await get_redis_connection() as r:
        data = await _get_scratchpad_data(r, thread_id)
        todos = data.get("todos", [])
        
        filtered = [item for item in todos if item.get("id") != todo_id]
        if len(filtered) == len(todos):
            return f"Error: Task with ID '{todo_id}' not found."
        
        data["todos"] = filtered
        await _save_scratchpad_data(r, thread_id, data)
        return f"Successfully deleted task with ID '{todo_id}'."

@tool
async def scratchpad_update_notes(notes: str, config: RunnableConfig) -> str:
    """
    Overwrite the general markdown notes section in the scratchpad.
    Use this to keep track of long-term insights, code structures, research plans, or key context.
    """
    thread_id = config.get("configurable", {}).get("thread_id")
    if not thread_id:
        return "Error: No active thread_id found in config. Cannot update scratchpad notes."

    async with await get_redis_connection() as r:
        data = await _get_scratchpad_data(r, thread_id)
        data["notes"] = notes
        await _save_scratchpad_data(r, thread_id, data)
        return "Successfully updated scratchpad notes."
