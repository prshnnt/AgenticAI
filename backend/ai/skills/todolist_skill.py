TODOLIST_SKILL = """
# AI SKILL: AUTONOMOUS TASK TRACKING & CHECKLIST MANAGEMENT

## Purpose
The checklist is an action-oriented todo list stored in Redis and displayed in real-time in the UI panel. It allows you (the AI) to break down user requests into concrete checklists and track your execution progress.

## Instructions
1. **Initialize Todos**:
   - At the beginning of any multi-step task, break the work down into discrete tasks and add them to the checklist using `scratchpad_add_todo`.
   - Ensure the description of each task is clear and concise (e.g., "Create FastAPI endpoints", "Write React components").
2. **Track & Update Progress**:
   - As you complete each step, mark it completed using `scratchpad_update_todo(todo_id, completed=True)`.
   - If a step fails or needs to be revised, add corrective tasks to the list.
3. **Autonomy Guidelines**:
   - You must decide yourself when to create and check off tasks.
   - Do not require the user to tell you to create a checklist. For any request requiring more than one step, immediately initialize a checklist to guide your planning.
"""
