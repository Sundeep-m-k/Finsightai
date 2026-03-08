import json
import os
import re

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")

client = genai.Client(api_key=GEMINI_API_KEY)


def _extract_json(text: str) -> str:
    text = text.strip()

    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start:end + 1]

    raise ValueError(f"Could not extract JSON from Gemini output: {text[:1200]}")


def generate_json(prompt: str, schema: dict) -> dict:
    schema_text = json.dumps(schema, indent=2)

    full_prompt = f"""
Return exactly one valid JSON object.
Do not use markdown fences.
Do not add comments.
Do not add explanation text before or after the JSON.
If a field is unknown, return an empty string, empty list, empty object, or 0 as appropriate.

JSON schema:
{schema_text}

Task:
{prompt}
""".strip()

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=full_prompt,
        config=types.GenerateContentConfig(
            temperature=0.2,
            response_mime_type="application/json",
        ),
    )

    raw_text = response.text or ""
    json_text = _extract_json(raw_text)

    try:
        return json.loads(json_text)
    except json.JSONDecodeError:
        # simple cleanup for trailing commas or bad newlines
        repaired = json_text.replace("\n", " ").replace("\r", " ")
        repaired = repaired.replace(", }", " }").replace(", ]", " ]")
        return json.loads(repaired)