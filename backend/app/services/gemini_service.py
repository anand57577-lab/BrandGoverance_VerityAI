
import json
import logging
import random
import time

from google import genai
from google.genai import types

from app.core.config import settings


logger = logging.getLogger(__name__)


# Primary model followed by fallback models.
# These models must be available to your Gemini API project.
DEFAULT_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
]


def _parse_gemini_result(response_obj) -> dict:
    """Parse and validate the JSON response from Gemini."""

    if response_obj is None:
        raise RuntimeError("Gemini returned an empty response.")

    if hasattr(response_obj, "parsed") and response_obj.parsed is not None:
        result = response_obj.parsed

    elif hasattr(response_obj, "text") and response_obj.text:
        response_text = response_obj.text.strip()

        if response_text.startswith("```"):
            response_text = response_text.strip("`").strip()

            if response_text.lower().startswith("json"):
                response_text = response_text[4:].strip()

        result = json.loads(response_text)

    else:
        raise RuntimeError("Gemini returned an empty response.")

    if not isinstance(result, dict):
        raise ValueError("Gemini returned a non-object response.")

    return result


def _validate_result(result: dict) -> dict:
    """Validate Gemini's analysis structure."""

    required_keys = {
        "overall_status",
        "risk_level",
        "summary",
        "conclusion",
        "findings",
        "limitations",
    }

    if not required_keys.issubset(result):
        missing = required_keys - set(result.keys())
        raise ValueError(
            f"Gemini returned an incomplete analysis. Missing: {missing}"
        )

    if result["overall_status"] not in {
        "issues_found",
        "needs_review",
        "matched_reference",
    }:
        raise ValueError("Gemini returned an invalid overall status.")

    if result["risk_level"] not in {"high", "medium", "low"}:
        raise ValueError("Gemini returned an invalid risk level.")

    if not isinstance(result["summary"], str):
        raise ValueError("Gemini summary must be a string.")

    if not isinstance(result["findings"], list):
        raise ValueError("Gemini findings must be a list.")

    if not isinstance(result["limitations"], list):
        raise ValueError("Gemini limitations must be a list.")

    if not isinstance(result["conclusion"], str):
        raise ValueError("Gemini conclusion must be a string.")

    if not result["conclusion"].strip():
        raise ValueError("Gemini returned an empty conclusion.")
    
    allowed_statuses = {
        "guideline_conflict",
        "supported_wording_match",
        "specification_wording_match",
        "evidence_wording_match",
        "unverified",
    }

    for finding in result["findings"]:
        if not isinstance(finding, dict):
            raise ValueError("Gemini returned an invalid finding.")

        if finding.get("status") not in allowed_statuses:
            raise ValueError("Gemini returned an invalid finding status.")

        if finding.get("severity") not in {"high", "medium", "low"}:
            raise ValueError("Gemini returned an invalid finding severity.")

        if not isinstance(finding.get("claim_text"), str):
            raise ValueError("Gemini finding is missing claim_text.")

        if not isinstance(finding.get("explanation"), str):
            raise ValueError("Gemini finding is missing explanation.")

    return result


def _is_retryable_error(exc: Exception) -> bool:
    """Identify temporary API errors that may succeed on retry."""

    message = str(exc).lower()

    retryable_indicators = [
        "503",
        "unavailable",
        "high demand",
        "429",
        "resource_exhausted",
        "rate limit",
        "too many requests",
        "500",
        "502",
        "504",
        "internal server error",
        "deadline exceeded",
        "timed out",
        "timeout",
    ]

    return any(
        indicator in message
        for indicator in retryable_indicators
    )


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

    api_key = settings.GEMINI_API_KEY

    configured_model = settings.GEMINI_MODEL or "gemini-3.8-flash"

    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is missing from the backend environment."
        )

    # Keep the configured model first.
    models = list(dict.fromkeys([
        configured_model,
        *DEFAULT_MODELS,
    ]))

    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=120000),
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
You are VerityAI, an advanced AI-powered brand governance
and advertisement compliance reviewer.

Your task is to semantically analyze the advertisement using
the supplied organization information, product specifications,
approved claims, approved documents and brand guidelines.

Do not simply search for exact wording matches.

Perform the following analysis:

1. CLAIM EXTRACTION
Identify individual factual and promotional claims in the
advertisement, including implied claims.

2. SEMANTIC EVIDENCE COMPARISON
Compare each claim with the supplied approved evidence.
Understand equivalent meanings even when the wording differs.

3. BRAND GUIDELINE REVIEW
Check brand voice, preferred terminology, restricted phrases,
tone and other supplied guideline requirements.

4. CLAIM VERIFICATION
Determine whether each advertisement claim is supported,
contradicted or not sufficiently supported by the supplied evidence.

5. RISK ASSESSMENT
Evaluate the seriousness of each finding and explain why
the advertisement needs approval, correction or further review.


ADDITIONAL ANALYSIS REQUIREMENTS:

1. Evaluate every distinct factual or promotional claim separately.
2. Do not create duplicate findings for the same claim.
3. Do not mark a claim unverified merely because its wording
   does not exactly match a product specification.
4. Compare meaning, not just exact words.
5. Use only the supplied product facts and approved evidence.
6. A product specification can support descriptive attributes,
   but it does not automatically substantiate health or nutrition claims.
7. Identify contradictions between advertising claims and
   product specifications.
8. Treat general promotional expressions and subjective
   opinions differently from measurable factual claims.
9. Do not classify general advertising language as factually
   supported unless there is actual supporting evidence.
10. Do not invent laboratory results, certifications, research,
    endorsements, statistics or regulatory approvals.
11. For each finding, identify the exact evidence source
    when one is available.
12. If evidence is insufficient, explain precisely what evidence
    is missing and recommend what should be submitted.

OVERALL ASSESSMENT:

- High risk: serious contradiction, prohibited wording,
  or potentially misleading factual claims.
- Medium risk: unsupported factual claims or claims requiring
  significant substantiation.
- Low risk: no material issues identified from supplied evidence.
- Never declare legal or regulatory compliance guaranteed.
- A human reviewer must make the final decision.


FINAL CONCLUSION REQUIREMENTS:

After completing the claim-by-claim analysis, write one meaningful
overall conclusion for the entire advertisement.

The conclusion must:

1. Summarize the overall advertisement quality and verification result.
2. Explain whether the advertisement's claims are supported by the
   supplied approved product specifications, claims and documents.
3. Mention any important brand guideline conflicts or unsupported claims.
4. Identify any remaining evidence gaps or risks.
5. State whether the advertisement is suitable to proceed to human
   approval, requires modification, or requires additional evidence.
6. Give a clear final recommendation to the reviewer.

IMPORTANT:
- Write 4–6 complete sentences.
- Use the actual advertisement and evidence supplied in the request.
- Do not repeat the individual finding explanations.
- Do not invent product information or evidence.
- Do not claim legal or regulatory compliance is guaranteed.
- If no material issues are found, clearly acknowledge that.
- If issues exist, clearly explain what must be corrected.
- Distinguish between editorial suggestions and actual compliance risks.
- The conclusion must be specific to the advertisement being analysed.


Important rules:

- Never invent evidence, documents or sources.
- Never claim that a statement is factually verified merely
  because similar wording exists.
- A semantic similarity is not proof of factual truth.
- Only approved information may be treated as approved evidence.
- Pending information must not be treated as approved.
- Flag direct and semantic guideline conflicts.
- Identify unsupported or exaggerated claims.
- Explain the reasoning for each finding.
- Recommend human review where evidence is insufficient.
- Do not make a final legal or regulatory compliance guarantee.
- Do not automatically mark an advertisement compliant.

Return valid JSON with exactly these keys:

{
  "overall_status": "issues_found, needs_review, or matched_reference",
  "risk_level": "high, medium, or low",
  "summary": "short explanation",
  "conclusion": "A detailed overall conclusion of the advertisement review.",
  "findings": [
    {
      "claim_text": "advertisement statement",
      "status": "guideline_conflict, supported_wording_match, specification_wording_match, evidence_wording_match, or unverified",
      "severity": "high, medium, or low",
      "explanation": "detailed semantic reasoning based on supplied evidence",
      "source": "provided source name or null",
      "suggested_correction": "recommendation or null"
    }
  ],
  "limitations": [
    "limitation"
  ]
}

Status guidance:

- issues_found/high: clear restricted phrase or serious guideline conflict.
- needs_review/medium: important claims are unsupported,
  ambiguous or require human verification.
- matched_reference/low: no material conflicts or
  unsupported claims were identified.

Always explain the evidence behind your decision.
A human must make the final publication decision.
"""

    last_error = None

    # Retry temporary errors and move to fallback models.
    for model in models:

        for attempt in range(3):

            try:
                logger.info(
                    "Attempting Gemini analysis with model=%s attempt=%s",
                    model,
                    attempt + 1,
                )

                response = client.models.generate_content(
                    model=model,
                    contents=json.dumps(
                        evidence,
                        ensure_ascii=False,
                    ),
                    config=types.GenerateContentConfig(
                        system_instruction=instructions,
                        response_mime_type="application/json",
                    ),
                )

                result = _parse_gemini_result(response)
                result = _validate_result(result)

                # Record the model that actually returned the result.
                result["model_used"] = model

                logger.info(
                    "Gemini analysis completed successfully using %s",
                    model,
                )

                return result

            except Exception as exc:

                last_error = exc

                logger.exception(
                    "Gemini request failed: model=%s attempt=%s",
                    model,
                    attempt + 1,
                )

                if not _is_retryable_error(exc):
                    # Do not retry permanent errors.
                    break

                if attempt < 2:
                    delay = min(
                        2 ** (attempt + 1) + random.uniform(0, 1),
                        30,
                    )

                    logger.warning(
                        "Temporary Gemini error. Retrying in %.2f seconds.",
                        delay,
                    )

                    time.sleep(delay)

                else:
                    logger.warning(
                        "Retries exhausted for model %s. "
                        "Trying the next fallback model.",
                        model,
                    )

    raise RuntimeError(
        "All configured Gemini models failed. "
        f"Last error: {last_error}"
    ) from last_error
