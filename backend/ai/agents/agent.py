import os
import sys

from dotenv import load_dotenv
load_dotenv()

from langchain_ollama import ChatOllama
from langchain_core.tools import tool
from langgraph.checkpoint.memory import InMemorySaver
from deepagents import create_deep_agent
from config import settings
from ai.tools import websearch

SYSTEM_PROMPT = "You are a helpful AI assistant."

# --- Custom Tools ---
tools = [
    websearch
]

def get_model():
    """
    Get the model based on the model name.
    """
    return ChatOllama(
        model=settings.ollama_model,
        base_url=settings.ollama_base_url,
        temperature=0
    )
    

class DeepAgentService:

    def __init__(self):
        # Reusable models
        self.models = get_model()

        # Reusable tools
        self.tools = tools

        # Reusable persistent checkpointer 
        # (Using InMemorySaver as a placeholder. Swap with AsyncRedisSaver/AsyncPostgresSaver as needed)
        self.checkpointer = InMemorySaver()

        # # Default chat model
        # self.chat_model = self.models["planner"]

        # Reusable subagents
        self.subagents = []

        # Build ONCE
        self.agent = self._build_agent()

    def _build_agent(self):
        return create_deep_agent(
            model=self.chat_model,
            tools=self.tools,
            subagents=self.subagents,
            system_prompt=SYSTEM_PROMPT,
            checkpointer=self.checkpointer
        )

    async def stream(
        self,
        message: str,
        thread_id: str
    ):
        config = {
            "configurable": {
                "thread_id": thread_id
            }
        }

        async for event in self.agent.astream_events(
            {
                "messages": [
                    {
                        "role": "user",
                        "content": message
                    }
                ]
            },
            config=config,
            version="v2"
        ):
            yield event


deep_agent_service = DeepAgentService()