
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AdvertisementReview(Base):
    __tablename__ = "advertisement_reviews"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    advertisement_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_conclusion: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_findings: Mapped[list | None] = mapped_column(JSON, nullable=True)
    ai_risk_level: Mapped[str | None] = mapped_column(String(30), nullable=True)
    ai_overall_status: Mapped[str | None] = mapped_column(String(50), nullable=True)

    review_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="approved",
        index=True,
    )

    reviewer_comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    product: Mapped["Product"] = relationship()