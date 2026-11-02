
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.organization import Organization, Brand
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationResponse,
)

router = APIRouter(
    prefix="/api/organizations",
    tags=["Organizations"],
)


@router.post(
    "",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_organization(
    payload: OrganizationCreate,
    db: Session = Depends(get_db),
):
    organization = Organization(
        legal_name=payload.legal_name,
        industry=payload.industry,
        country_market=payload.country_market,
        description=payload.description,
    )

    db.add(organization)
    db.flush()

    brand = Brand(
        organization_id=organization.id,
        name=payload.primary_brand_name,
    )
    db.add(brand)

    try:
        db.commit()
        db.refresh(organization)
        db.refresh(brand)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save the organization.",
        )

    return OrganizationResponse(
        id=organization.id,
        brand_id=brand.id,
        legal_name=organization.legal_name,
        primary_brand_name=brand.name,
        industry=organization.industry,
        country_market=organization.country_market,
        description=organization.description,
    )


@router.get("/{organization_id}", response_model=OrganizationResponse)
def get_organization(
    organization_id: int,
    db: Session = Depends(get_db),
):
    organization = db.get(Organization, organization_id)

    if organization is None:
        raise HTTPException(
            status_code=404,
            detail="Organization not found.",
        )

    brand = (
        db.query(Brand)
        .filter(Brand.organization_id == organization_id)
        .first()
    )

    return OrganizationResponse(
        id=organization.id,
        brand_id=brand.id if brand else 0,
        legal_name=organization.legal_name,
        primary_brand_name=brand.name if brand else "",
        industry=organization.industry,
        country_market=organization.country_market,
        description=organization.description,
    )
