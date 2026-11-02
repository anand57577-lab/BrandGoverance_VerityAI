
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.product import Product
from app.models.advertisement_review import AdvertisementReview
from app.schemas.governance import (
    AdvertisementAnalysisRequest,
    AdvertisementAnalysisResponse,
)
from app.services.governance_service import analyze_advertisement

router = APIRouter(
    prefix="/api/governance",
    tags=["Brand Governance Analysis"],
)


@router.post(
    "/analyze",
    response_model=AdvertisementAnalysisResponse,
)
def analyze(
    payload: AdvertisementAnalysisRequest,
    db: Session = Depends(get_db),
):
    product = db.get(Product, payload.product_id)

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found.",
        )

    # Run existing Gemini analysis
    result = analyze_advertisement(
        db=db,
        product=product,
        advertisement_text=payload.advertisement_text,
    )

    # Automatically save positive results
    if result["overall_status"] == "matched_reference":
        review = AdvertisementReview(
            product_id=product.id,
            advertisement_text=payload.advertisement_text,
            review_status="approved",
        )

        db.add(review)
        db.commit()

    return result


@router.get("/approved")
def get_approved_advertisements(
    db: Session = Depends(get_db),
):
    reviews = (
        db.query(AdvertisementReview)
        .filter(AdvertisementReview.review_status == "approved")
        .order_by(AdvertisementReview.created_at.desc())
        .all()
    )

    return [
        {
            "id": review.id,
            "product_id": review.product.id,
            "product_name": review.product.name,
            "product_details": review.product.specifications,
            "advertisement_text": review.advertisement_text,
            "status": review.review_status,
            "created_at": review.created_at,
        }
        for review in reviews
    ]
