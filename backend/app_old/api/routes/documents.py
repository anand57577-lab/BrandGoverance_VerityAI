
from io import BytesIO

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.document import Document
from app.models.organization import Brand
from app.models.product import Product
from app.schemas.documents import DocumentResponse

router = APIRouter(tags=["Documents"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_DOCUMENT_TYPES = {
    "supporting",
    "product_specification",
    "lab_report",
    "certification",
    "approved_claims",
    "brand_guidelines",
}


@router.post(
    "/api/brands/{brand_id}/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_document(
    brand_id: int,
    file: UploadFile = File(...),
    product_id: int | None = Form(default=None),
    document_type: str = Form(default="supporting"),
    db: Session = Depends(get_db),
):
    brand = db.get(Brand, brand_id)
    if brand is None:
        raise HTTPException(status_code=404, detail="Brand not found.")

    if document_type not in ALLOWED_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=422,
            detail="Unsupported document type.",
        )

    if product_id is not None:
        product = db.get(Product, product_id)
        if product is None or product.brand_id != brand_id:
            raise HTTPException(
                status_code=400,
                detail="Product does not belong to this brand.",
            )

    filename = (file.filename or "").replace("\\", "/").split("/")[-1]
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=415,
            detail="Only PDF files are accepted by this endpoint.",
        )

    if file.content_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(
            status_code=415,
            detail="The uploaded file must be a PDF.",
        )

    # Read one byte beyond the limit so oversized files are detected.
    file_data = file.file.read(MAX_FILE_SIZE + 1)

    if not file_data:
        raise HTTPException(status_code=400, detail="The file is empty.")

    if len(file_data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="PDF size must not exceed 10 MB.",
        )

    if not file_data.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=415,
            detail="The file does not have a valid PDF signature.",
        )

    document = Document(
        brand_id=brand_id,
        product_id=product_id,
        filename=filename[:255],
        content_type="application/pdf",
        document_type=document_type,
        file_size=len(file_data),
        file_data=file_data,
        approval_status="pending",
    )

    try:
        db.add(document)
        db.commit()
        db.refresh(document)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save the document.",
        )
    finally:
        file.file.close()

    return document


@router.get(
    "/api/brands/{brand_id}/documents",
    response_model=list[DocumentResponse],
)
def list_documents(
    brand_id: int,
    db: Session = Depends(get_db),
):
    if db.get(Brand, brand_id) is None:
        raise HTTPException(status_code=404, detail="Brand not found.")

    return (
        db.query(Document)
        .filter(Document.brand_id == brand_id)
        .order_by(Document.id.desc())
        .all()
    )


@router.get("/api/documents/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
):
    document = db.get(Document, document_id)

    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    return StreamingResponse(
        BytesIO(document.file_data),
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{document.filename}"'
            ),
            "Content-Length": str(document.file_size),
            "X-Content-Type-Options": "nosniff",
        },
    )
