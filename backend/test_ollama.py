import asyncio
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="d:/Workspace/AgenticAI/backend/.env")

from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage

async def main():
    print("OLLAMA_BASE_URL:", os.environ.get("OLLAMA_BASE_URL"))
    # print("OLLAMA_API_KEY:", os.environ.get("OLLAMA_API_KEY"))
    
    model = ChatOllama(
        model="gpt-oss:120b",
        base_url=os.environ.get("OLLAMA_BASE_URL"),
        temperature=0
    )
    
    messages = [HumanMessage(content="List the database tables.")]
    try:
        response = await model.ainvoke(messages)
        print("Response class:", response.__class__.__name__)
        print("Response content:", repr(response.content))
        print("Additional kwargs:", response.additional_kwargs)
        if hasattr(response, "tool_calls"):
            print("Tool calls:", response.tool_calls)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
