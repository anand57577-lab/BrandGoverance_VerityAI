
import re

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.product import Product, ApprovedClaim
from app.models.guideline import BrandGuideline
from app.models.document import Document
from app.services.text_extraction import extract_text_from_pdf
from app.services.gemini_service import analyze_with_gemini

import logging

logger = logging.getLogger(__name__)

def _normalise(text: str) -> str:
    return re.sub(r"\s+", " ", text.casefold()).strip()


def _contains_phrase(text: str, phrase: str) -> bool:
    text = _normalise(text)
    phrase = _normalise(phrase)

    if not phrase:
        return False

    pattern = r"(?<!\w)" + re.escape(phrase) + r"(?!\w)"
    return re.search(pattern, text) is not None


def _split_lines(value: str | None) -> list[str]:
    if not value:
        return []

    return [
        line.strip(" \t\r\n•-")
        for line in value.splitlines()
        if line.strip(" \t\r\n•-")
    ]


def _split_claims(text: str) -> list[str]:
    """Split advertisement text into simple sentence-like statements."""
    parts = re.split(r"(?<=[.!?])\s+|\n+", text.strip())

    return [
        part.strip()
        for part in parts
        if len(part.strip()) >= 5
    ]


def analyze_advertisement(
    db: Session,
    product: Product,
    advertisement_text: str,
) -> dict:
    ad_text = advertisement_text.strip()
    findings: list[dict] = []

    brand = product.brand
    organization = brand.organization

    organization_info = {
    "legal_name": organization.legal_name,
    "industry": organization.industry,
    "country_market": organization.country_market,
    "description": organization.description,
    }

    brand_name = brand.name
    
    
    guidelines = (
        db.query(BrandGuideline)
        .filter(BrandGuideline.brand_id == product.brand_id, 
                BrandGuideline.approval_status == "approved")
        .order_by(BrandGuideline.version.desc())
        .all()
    )

    approved_claims = (
        db.query(ApprovedClaim)
        .filter(
            ApprovedClaim.product_id == product.id,
            ApprovedClaim.approval_status == "approved",
        )
        .all()
    )

    pending_claims = (
        db.query(ApprovedClaim)
        .filter(
            ApprovedClaim.product_id == product.id,
            ApprovedClaim.approval_status == "pending",
        )
        .count()
    )

    # Keep the guideline record ID attached to each restricted phrase.
    restricted_phrases: list[tuple[str, int]] = []

    for guideline in guidelines:
        for phrase in _split_lines(guideline.restricted_phrases):
            restricted_phrases.append((phrase, guideline.id))

    for phrase, guideline_id in restricted_phrases:
        if _contains_phrase(ad_text, phrase):
            findings.append({
                "claim_text": phrase,
                "status": "guideline_conflict",
                "severity": "high",
                "explanation": (
                    "This advertisement contains a phrase listed in "
                    "the brand's restricted phrases."
                ),
                "source": f"Brand guideline record #{guideline_id}",
                "suggested_correction": (
                    "Remove or replace the restricted phrase, then "
                    "submit the revised advertisement for review."
                ),
            })

    # Match explicitly approved claim wording.
    for claim in approved_claims:
        if _contains_phrase(ad_text, claim.claim_text):
            findings.append({
                "claim_text": claim.claim_text,
                "status": "supported_wording_match",
                "severity": "low",
                "explanation": (
                    "The advertisement contains wording matching "
                    "an approved claim stored for this product. "
                    "This wording match does not independently prove "
                    "the claim's factual accuracy."
                ),
                "source": f"Approved claim record #{claim.id}",
                "suggested_correction": None,
            })

    # Product specifications are reference information, not proof.
    specifications = product.specifications or ""

    for line in _split_lines(specifications):
        if _contains_phrase(ad_text, line):
            findings.append({
                "claim_text": line,
                "status": "specification_wording_match",
                "severity": "low",
                "explanation": (
                    "The advertisement matches wording in the stored "
                    "product specification. The specification has not "
                    "been independently verified by this check."
                ),
                "source": f"Product specification for {product.name}",
                "suggested_correction": None,
            })

    # Retrieve documents associated with this brand and either:
    # (a) this product specifically, or (b) the whole brand.
    documents = (
        db.query(Document)
        .filter(
            Document.brand_id == product.brand_id,
            or_(
                Document.product_id == product.id,
                Document.product_id.is_(None),
            ),
        )
        .order_by(Document.uploaded_at.desc())
        .all()
    )

    approved_documents = [
        document
        for document in documents
        if (document.approval_status or "").casefold() == "approved"
    ]

    pending_documents = [
        document
        for document in documents
        if (document.approval_status or "").casefold() == "pending"
    ]

    # Extract text from approved PDFs and compare literal wording.
    extracted_documents: list[dict] = []
    extraction_failures = 0

    for document in approved_documents:
        try:
            extracted_text = extract_text_from_pdf(document.file_data)

            extracted_documents.append({
                "document": document,
                "text": extracted_text,
            })
        except (ValueError, TypeError):
            extraction_failures += 1

    
    # Run Gemini using only approved guidelines, claims and documents.
    gemini_result = None

    try:
        gemini_result = analyze_with_gemini(
            organization=organization_info,
            brand_name=brand_name,
            product_name=product.name,
            specifications=product.specifications or "",
            advertisement_text=ad_text,
            guidelines=[
                {
                    "version": guideline.version,
                    "voice_and_tone": guideline.voice_and_tone,
                    "preferred_terminology": guideline.preferred_terminology,
                    "restricted_phrases": guideline.restricted_phrases,
                    "visual_identity_notes": guideline.visual_identity_notes,
                }
                for guideline in guidelines
            ],
            approved_claims=[
                claim.claim_text for claim in approved_claims
            ],
            approved_documents=[
                {
                    "filename": item["document"].filename,
                    "text": item["text"][:12000],
                }
                for item in extracted_documents
            ],
        )
    except Exception:
        # Keep the existing rule-based analysis available if Gemini fails.
        logger.exception("Gemini analysis failed; continuing with rule-based findings.")
        gemini_result = None

    
    
    claims = _split_claims(ad_text)
    evidence_matched_claims: set[str] = set()

    for claim_text in claims:
        for item in extracted_documents:
            if _contains_phrase(item["text"], claim_text):
                document = item["document"]

                findings.append({
                    "claim_text": claim_text,
                    "status": "evidence_wording_match",
                    "severity": "low",
                    "explanation": (
                        "The advertisement statement appears verbatim "
                        "in an approved document. This confirms a text "
                        "match only; it does not establish factual "
                        "accuracy or regulatory compliance."
                    ),
                    "source": (
                        f"{document.filename} "
                        f"(document record #{document.id})"
                    ),
                    "suggested_correction": None,
                })

                evidence_matched_claims.add(_normalise(claim_text))
                break

    # Flag advertisement statements that have no direct wording match.
    # Do not treat a restricted phrase or a stored specification as proof.
    approved_claim_texts = [
        claim.claim_text
        for claim in approved_claims
        if claim.claim_text
    ]

    specification_lines = _split_lines(product.specifications or "")

    for claim_text in claims:
        if _normalise(claim_text) in evidence_matched_claims:
            continue

        if any(
            _contains_phrase(claim_text, approved_text)
            for approved_text in approved_claim_texts
        ):
            continue

        if any(
            _contains_phrase(claim_text, line)
            for line in specification_lines
        ):
            continue

        if any(
            _contains_phrase(claim_text, phrase)
            for phrase, _ in restricted_phrases
        ):
            continue

        findings.append({
            "claim_text": claim_text,
            "status": "unverified",
            "severity": "medium",
            "explanation": (
                "No direct wording match was found in the approved "
                "claims, stored specifications or searchable text of "
                "approved documents. This does not mean the statement "
                "is false; it needs further evidence-based review."
            ),
            "source": None,
            "suggested_correction": (
                "Review the statement against relevant supporting "
                "evidence and submit it for human approval."
            ),
        })

    if not findings:
        findings.append({
            "claim_text": ad_text,
            "status": "unverified",
            "severity": "medium",
            "explanation": (
                "No actionable match or conflict was identified by "
                "the current rules. This is not proof that the complete "
                "advertisement is accurate."
            ),
            "source": None,
            "suggested_correction": (
                "Review the advertisement and its supporting evidence "
                "before publication."
            ),
        })

    has_conflict = any(
        finding["status"] == "guideline_conflict"
        for finding in findings
    )

    has_unverified = any(
        finding["status"] == "unverified"
        for finding in findings
    )

    if has_conflict:
        overall_status = "issues_found"
        risk_level = "high"
        summary = (
            "One or more restricted phrases were detected. "
            "Review the flagged wording before publication."
        )
    elif has_unverified:
        overall_status = "needs_review"
        risk_level = "medium"
        summary = (
            "One or more statements lack a direct match in the "
            "available references and need further review."
        )
    else:
        overall_status = "matched_reference"
        risk_level = "low"
        summary = (
            "Some advertisement wording matched stored references. "
            "These matches do not independently prove factual accuracy."
        )

    limitations = [
        "This service uses literal text matching, not semantic AI reasoning.",
        "PDF text is extracted only from approved documents associated "
        "with the selected product or its brand.",
        "A wording match does not prove that a claim is factually true.",
        "Scanned or image-only PDFs require OCR, which is not implemented.",
        "Documents marked pending are not treated as approved evidence.",
        "Human review is required before a final publication decision.",
    ]
    
    if gemini_result is None:
        limitations.append(
        "Gemini analysis was unavailable. Results contain rule-based "
        "checks only and must not be presented as AI-assisted analysis."
    )

    if pending_claims:
        limitations.append(
            f"{pending_claims} claim(s) are pending approval and were "
            "not treated as approved claims."
        )

    if pending_documents:
        limitations.append(
            f"{len(pending_documents)} associated document(s) are pending "
            "approval and were excluded from evidence matching."
        )

    if extraction_failures:
        limitations.append(
            f"{extraction_failures} approved document(s) could not be "
            "searched because their text could not be extracted."
        )
    
    # Add Gemini findings while preserving the existing rule-based results.
    if gemini_result:
        existing_keys = {
            (
                _normalise(str(f.get("claim_text", ""))),
                str(f.get("status", "")),
            )
            for f in findings
        }

        for finding in gemini_result.get("findings", []):
            if not isinstance(finding, dict):
                continue

            key = (
                _normalise(str(finding.get("claim_text", ""))),
                str(finding.get("status", "")),
            )

            if key not in existing_keys:
                findings.append(finding)
                existing_keys.add(key)

        limitations.append(
            "Gemini AI assisted with semantic review. Its findings "
            "require human verification and do not prove factual truth "
            "or legal compliance."
        )

        for limitation in gemini_result.get("limitations", []):
            if isinstance(limitation, str) and limitation not in limitations:
                limitations.append(limitation)

        # Apply conservative status escalation; do not downgrade rule findings.
        if gemini_result.get("overall_status") == "issues_found":
            overall_status = "issues_found"
            risk_level = "high"
            summary = (
                "Gemini identified potential advertisement issues. "
                "Review the findings before publication."
            )
        elif (
            gemini_result.get("overall_status") == "needs_review"
            and overall_status == "matched_reference"
        ):
            overall_status = "needs_review"
            risk_level = "medium"
            summary = (
                "The advertisement requires further evidence-based review."
            )

    
        
    return {
        "product_id": product.id,
        "product_name": product.name,
        "overall_status": overall_status,
        "risk_level": risk_level,
        "summary": summary,
        "findings": findings,
        "limitations": limitations,
    }
