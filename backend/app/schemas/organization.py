
from pydantic import BaseModel, ConfigDict, Field


class OrganizationCreate(BaseModel):
    legal_name: str = Field(min_length=2, max_length=255)
    primary_brand_name: str = Field(min_length=2, max_length=255)
    industry: str = Field(min_length=2, max_length=100)
    country_market: str = Field(min_length=2, max_length=100)
    description: str | None = None


class OrganizationUpdate(BaseModel):
    legal_name: str | None = Field(default=None, max_length=255)
    primary_brand_name: str | None = Field(default=None, max_length=255)
    industry: str | None = Field(default=None, max_length=100)
    country_market: str | None = Field(default=None, max_length=100)
    description: str | None = None


class OrganizationResponse(BaseModel):
    id: int
    brand_id: int
    legal_name: str
    primary_brand_name: str
    industry: str
    country_market: str
    description: str | None

    model_config = ConfigDict(from_attributes=True)
