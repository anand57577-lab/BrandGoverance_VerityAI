
import json
import os

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()


def analyze_with_gemini(
    organization: dict,
    brand_name: str,
    product_name: str,
    specifications: str,
    advertisement_text: str,
    guidelines: list[dict],
    approved_claims: list[str],
    approved_documents: list[dict],
) -> dict:
    api_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is missing.")

    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=30000),
    )

    evidence = {
        "organization": organization,
        "brand_name": brand_name,
        "product_name": product_name,
        "product_specifications": specifications,
        "brand_guidelines": guidelines,
        "approved_claims": approved_claims,
        "approved_documents": approved_documents,
        "advertisement": advertisement_text,
    }

    instructions = """
You are VerityAI, a brand-governance advertisement reviewer.

Review the advertisement only against the supplied product information,
brand guidelines, approved claims, and approved document text.

Rules:
- Never invent evidence or sources.
- A wording match does not prove factual truth.
- Flag restricted phrases and guideline conflicts.
- Mark claims without sufficient support as unverified.
- Do not treat pending or unapproved information as approved.
- Do not make a final legal or regulatory compliance guarantee.
- Recommend human review where evidence is insufficient.

Return valid JSON with exactly these keys:
{
  "overall_status": "issues_found, needs_review, or matched_reference",
  "risk_level": "high, medium, or low",
  "summary": "short explanation",
  "findings": [
    {
      "claim_text": "advertisement statement",
      "status": "guideline_conflict, supported_wording_match, specification_wording_match, evidence_wording_match, or unverified",
      "severity": "high, medium, or low",
      "explanation": "reason based on supplied evidence",
      "source": "provided source name or null",
      "suggested_correction": "recommendation or null"
    }
  ],
  "limitations": ["limitation"]
}

Use issues_found/high for clear restricted-phrase conflicts.
Use needs_review/medium when important claims are unverified.
Use matched_reference/low only when no conflicts or material
unverified claims are identified. A human must make the final decision.
"""

    response = client.models.generate_content(
        model=model,
        contents=json.dumps(evidence, ensure_ascii=False),
        config=types.GenerateContentConfig(
            system_instruction=instructions,
            response_mime_type="application/json",
            temperature=0.1,
        ),
    )

    if not response.text:
        raise RuntimeError("Gemini returned an empty response.")

    result = json.loads(response.text)

    required_keys = {
        "overall_status",
        "risk_level",
        "summary",
        "findings",
        "limitations",
    }

    if not required_keys.issubset(result):
        raise ValueError("Gemini returned an incomplete analysis.")

    if result["overall_status"] not in {
        "issues_found", "needs_review", "matched_reference"
    }:
        raise ValueError("Gemini returned an invalid overall status.")

    if result["risk_level"] not in {"high", "medium", "low"}:
        raise ValueError("Gemini returned an invalid risk level.")

    if not isinstance(result["findings"], list):
        raise ValueError("Gemini findings must be a list.")

    if not isinstance(result["limitations"], list):
        raise ValueError("Gemini limitations must be a list.")

    return result
