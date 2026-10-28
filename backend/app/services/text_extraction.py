
from io import BytesIO

from pypdf import PdfReader


def extract_text_from_pdf(file_data: bytes) -> str:
    """
    Extract selectable text from PDF bytes.

    Args:
        file_data: PDF file contents stored or received as bytes.

    Returns:
        Extracted text from all PDF pages.

    Raises:
        ValueError: If the PDF is empty, invalid, encrypted,
                    or contains no extractable text.
    """
    if not file_data:
        raise ValueError("The PDF file is empty.")

    try:
        reader = PdfReader(BytesIO(file_data), strict=False)

        if reader.is_encrypted:
            try:
                if reader.decrypt("") == 0:
                    raise ValueError(
                        "The PDF is password-protected."
                    )
            except Exception as exc:
                if isinstance(exc, ValueError):
                    raise
                raise ValueError(
                    "The PDF is password-protected."
                ) from exc

        extracted_pages = []

        for page_number, page in enumerate(reader.pages, start=1):
            try:
                page_text = page.extract_text() or ""
                if page_text.strip():
                    extracted_pages.append(
                        f"[Page {page_number}]\n{page_text.strip()}"
                    )
            except Exception:
                # Continue if an individual page cannot be read.
                continue

        extracted_text = "\n\n".join(extracted_pages).strip()

        if not extracted_text:
            raise ValueError(
                "No selectable text was found. "
                "The PDF may be scanned or image-only."
            )

        return extracted_text

    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(
            "The file could not be read as a valid PDF."
        ) from exc
