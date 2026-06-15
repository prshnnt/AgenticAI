SCRATCHPAD_SKILL = """
# AI SKILL: AUTONOMOUS SCRATCHPAD NOTES MANAGEMENT

## Purpose
The AI Scratchpad is a persistent, session-level markdown document that you (the AI) must use to keep track of critical context, code designs, research summaries, or architectural plans. This information is preserved in Redis and displayed directly to the user in a dedicated UI panel.

## Instructions
1. **Initialize/Write Notes**:
   - For any complex task, research request, or multi-step plan, use `scratchpad_update_notes` to write a structured markdown plan or background note.
   - Include headings, bullet points, and code blocks for readability.
2. **When to Update**:
   - Update notes when you gather new information, resolve a step, design a code snippet, or discover configurations.
   - Update notes to act as your "external working memory" so you do not lose track of details if the chat context grows large.
3. **Autonomy Guidelines**:
   - You must decide yourself when to document key information. Do not wait for the user to explicitly ask you to take notes. If you retrieve search results or make design decisions, write them to the scratchpad immediately.
"""
