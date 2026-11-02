from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.organization import Brand
from app.models.guideline import BrandGuideline
from app.schemas.guidelines import (
    GuidelineCreate,
    GuidelineResponse,
)

router = APIRouter(
    prefix="/api/brands",
    tags=["Brand Guidelines"],
)


@router.post(
    "/{brand_id}/guidelines",
    response_model=GuidelineResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_guideline(
    brand_id: int,
    payload: GuidelineCreate,
    db: Session = Depends(get_db),
):
    brand = db.get(Brand, brand_id)

    if brand is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand not found.",
        )

    latest_version = (
        db.query(func.max(BrandGuideline.version))
        .filter(BrandGuideline.brand_id == brand_id)
        .scalar()
        or 0
    )

    guideline = BrandGuideline(
        brand_id=brand_id,
        voice_and_tone=payload.voice_and_tone,
        preferred_terminology=payload.preferred_terminology,
        restricted_phrases=payload.restricted_phrases,
        visual_identity_notes=payload.visual_identity_notes,
        version=latest_version + 1,
        approval_status="pending",
    )

    db.add(guideline)

    try:
        db.commit()
        db.refresh(guideline)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save brand guidelines.",
        )

    return guideline


@router.get(
    "/{brand_id}/guidelines",
    response_model=list[GuidelineResponse],
)
def get_guidelines(
    brand_id: int,
    db: Session = Depends(get_db),
):
    brand = db.get(Brand, brand_id)

    if brand is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand not found.",
        )

    return (
        db.query(BrandGuideline)
        .filter(BrandGuideline.brand_id == brand_id)
        .order_by(BrandGuideline.version.desc())
        .all()
    )