import json
import os
import re

import anthropic
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


def _extract_json(text: str) -> str:
    text = text.strip()

    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start:end + 1]

    raise ValueError(f"Could not extract JSON from Claude output: {text[:1000]}")


def generate_json(prompt: str, schema: dict) -> dict:
    schema_text = json.dumps(schema, indent=2)

    full_prompt = f"""
Return valid JSON only.
Do not include markdown.
Do not include explanation.
Follow this JSON schema exactly:

{schema_text}

User prompt:
{prompt}
""".strip()

    message = client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=1200,
        messages=[
            {
                "role": "user",
                "content": full_prompt,
            }
        ],
    )

    text_parts = []
    for block in message.content:
        if getattr(block, "type", None) == "text":
            text_parts.append(block.text)

    raw_text = "\n".join(text_parts).strip()
    return json.loads(_extract_json(raw_text))