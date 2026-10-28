from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class GuidelineCreate(BaseModel):
    voice_and_tone: str = Field(min_length=1)
    preferred_terminology: str | None = None
    restricted_phrases: str | None = None
    visual_identity_notes: str | None = None


class GuidelineResponse(BaseModel):
    id: int
    brand_id: int
    voice_and_tone: str
    preferred_terminology: str | None
    restricted_phrases: str | None
    visual_identity_notes: str | None
    version: int
    approval_status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)