
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.models.organization import Brand
from app.models.product import Product, ApprovedClaim
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
)

router = APIRouter(
    prefix="/api",
    tags=["Products & Facts"],
)


@router.post(
    "/brands/{brand_id}/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    brand_id: int,
    payload: ProductCreate,
    db: Session = Depends(get_db),
):
    brand = db.get(Brand, brand_id)

    if brand is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand not found.",
        )

    product = Product(
        brand_id=brand_id,
        name=payload.name.strip(),
        sku=payload.sku.strip(),
        category=payload.category,
        specifications=payload.specifications,
    )

    # Split out blank claims and store each remaining claim separately.
    claims = [
        ApprovedClaim(
            claim_text=claim.strip(),
            approval_status="pending",
        )
        for claim in payload.approved_claims
        if claim.strip()
    ]
    product.claims.extend(claims)

    try:
        db.add(product)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A product with this SKU already exists for this brand.",
        )
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save the product.",
        )

    saved_product = (
        db.query(Product)
        .options(selectinload(Product.claims))
        .filter(Product.id == product.id)
        .first()
    )

    if saved_product is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Product was saved but could not be retrieved.",
        )

    return saved_product


@router.get(
    "/brands/{brand_id}/products",
    response_model=list[ProductResponse],
)
def list_products(
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
        db.query(Product)
        .options(selectinload(Product.claims))
        .filter(Product.brand_id == brand_id)
        .order_by(Product.id.desc())
        .all()
    )


@router.get(
    "/products/{product_id}",
    response_model=ProductResponse,
)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .options(selectinload(Product.claims))
        .filter(Product.id == product_id)
        .first()
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )

    return product


@router.put(
    "/products/{product_id}",
    response_model=ProductResponse,
)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
):
    product = db.get(Product, product_id)

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )

    changes = payload.model_dump(exclude_unset=True)

    for field, value in changes.items():
        if isinstance(value, str):
            value = value.strip()
            if not value and field in {"name", "sku"}:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"{field} cannot be blank.",
                )
        setattr(product, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This SKU already exists for the brand.",
        )
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not update the product.",
        )

    updated_product = (
        db.query(Product)
        .options(selectinload(Product.claims))
        .filter(Product.id == product_id)
        .first()
    )

    return updated_product
