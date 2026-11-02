
from pydantic import BaseModel, Field


class AdvertisementAnalysisRequest(BaseModel):
    product_id: int = Field(gt=0)
    advertisement_text: str = Field(min_length=5, max_length=20000)


class Finding(BaseModel):
    claim_text: str
    status: str
    severity: str
    explanation: str
    source: str | None = None
    suggested_correction: str | None = None


class AdvertisementAnalysisResponse(BaseModel):
    product_id: int
    product_name: str

    # AI engine information
    analysis_engine: str
    gemini_status: str
    gemini_model: str | None = None
    gemini_error: str | None = None

    # Analysis results
    overall_status: str
    risk_level: str
    summary: str
    conclusion: str
    findings: list[Finding]
    limitations: list[str]
