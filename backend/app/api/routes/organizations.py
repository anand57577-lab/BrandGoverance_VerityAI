
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.organization import Organization, Brand
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationResponse,
)

router = APIRouter(
    prefix="/api/organizations",
    tags=["Organizations"],
)


def build_response(db: Session, organization: Organization):
    brand = (
        db.query(Brand)
        .filter(Brand.organization_id == organization.id)
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


@router.get("/current", response_model=OrganizationResponse | None)
def get_current_organization(db: Session = Depends(get_db)):
    organization = db.query(Organization).order_by(Organization.id).first()

    # Empty database is a normal state, not an API error.
    if organization is None:
        return None

    return build_response(db, organization)


@router.post(
    "",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_organization(
    payload: OrganizationCreate,
    db: Session = Depends(get_db),
):
    # VerityAI supports only one organization.
    existing = db.query(Organization).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="An organization already exists. Update the existing organization.",
        )

    try:
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
        db.commit()
        db.refresh(organization)
        db.refresh(brand)

        return build_response(db, organization)

    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Could not create organization: {str(exc)}",
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

    return build_response(db, organization)


@router.put("/{organization_id}", response_model=OrganizationResponse)
def update_organization(
    organization_id: int,
    payload: OrganizationUpdate,
    db: Session = Depends(get_db),
):
    organization = db.get(Organization, organization_id)

    if organization is None:
        raise HTTPException(
            status_code=404,
            detail="Organization not found.",
        )

    try:
        changes = payload.model_dump(exclude_unset=True)

        brand_name = changes.pop("primary_brand_name", None)

        for field, value in changes.items():
            setattr(organization, field, value)

        brand = (
            db.query(Brand)
            .filter(Brand.organization_id == organization.id)
            .first()
        )

        if brand_name is not None:
            if brand:
                brand.name = brand_name
            else:
                brand = Brand(
                    organization_id=organization.id,
                    name=brand_name,
                )
                db.add(brand)

        db.commit()
        db.refresh(organization)

        return build_response(db, organization)

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Could not update organization: {str(exc)}",
        )
