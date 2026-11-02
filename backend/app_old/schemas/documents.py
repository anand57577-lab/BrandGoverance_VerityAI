
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    id: int
    brand_id: int
    product_id: int | None
    filename: str
    content_type: str
    document_type: str
    file_size: int
    approval_status: str
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)
