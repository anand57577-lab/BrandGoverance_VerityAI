
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    sku: str = Field(min_length=1, max_length=100)
    category: str | None = Field(default=None, max_length=150)
    specifications: str | None = None

    # The UI accepts one claim per line.
    approved_claims: list[str] = Field(default_factory=list)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    sku: str | None = Field(default=None, min_length=1, max_length=100)
    category: str | None = Field(default=None, max_length=150)
    specifications: str | None = None


class ApprovedClaimResponse(BaseModel):
    id: int
    product_id: int
    claim_text: str
    approval_status: str
    source_document_id: int | None
    effective_date: datetime | None
    review_date: datetime | None

    model_config = ConfigDict(from_attributes=True)


class ProductResponse(BaseModel):
    id: int
    brand_id: int
    name: str
    sku: str
    category: str | None
    specifications: str | None
    created_at: datetime
    claims: list[ApprovedClaimResponse]

    model_config = ConfigDict(from_attributes=True)
