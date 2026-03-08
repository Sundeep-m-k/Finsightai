import json
import re
from functools import lru_cache

from transformers import pipeline


MODEL_NAME = "google/flan-t5-base"


@lru_cache(maxsize=1)
def _generator():
    return pipeline(
        "text2text-generation",
        model=MODEL_NAME,
    )


def _extract_json(text: str) -> str:
    text = text.strip()

    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start:end + 1]

    raise ValueError(f"Could not extract JSON from model output: {text[:500]}")


def generate_json(prompt: str, schema: dict) -> dict:
    schema_text = json.dumps(schema, indent=2)

    full_prompt = f"""
Return valid JSON only.
Do not add explanation.
Follow this JSON schema exactly:

{schema_text}

User prompt:
{prompt}
""".strip()

    result = _generator()(
        full_prompt,
        max_new_tokens=512,
        do_sample=False,
    )[0]["generated_text"]

    parsed = json.loads(_extract_json(result))
    return parsed