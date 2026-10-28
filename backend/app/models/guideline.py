
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class BrandGuideline(Base):
    __tablename__ = "brand_guidelines"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    brand_id: Mapped[int] = mapped_column(
        ForeignKey("brands.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    voice_and_tone: Mapped[str] = mapped_column(
        Text, nullable=False
    )
    preferred_terminology: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    restricted_phrases: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    visual_identity_notes: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    version: Mapped[int] = mapped_column(default=1, nullable=False)
    approval_status: Mapped[str] = mapped_column(
        String(30), default="pending", nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    brand: Mapped["Brand"] = relationship(
        back_populates="guidelines"
    )
