
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.product import Product
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

    return analyze_advertisement(
        db=db,
        product=product,
        advertisement_text=payload.advertisement_text,
    )
