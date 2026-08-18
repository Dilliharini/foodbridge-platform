from datetime import datetime
from enum import Enum
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Enum as SqlEnum, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class Role(str, Enum):
    DONOR = "DONOR"
    NGO = "NGO"
    VOLUNTEER = "VOLUNTEER"
    ADMIN = "ADMIN"


class DonationStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    REQUESTED = "REQUESTED"
    ACCEPTED = "ACCEPTED"
    PICKUP_ASSIGNED = "PICKUP_ASSIGNED"
    PICKED_UP = "PICKED_UP"
    DELIVERED = "DELIVERED"
    COMPLETED = "COMPLETED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class RequestStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class PickupStatus(str, Enum):
    ASSIGNED = "ASSIGNED"
    ACCEPTED = "ACCEPTED"
    PICKED_UP = "PICKED_UP"
    DELIVERED = "DELIVERED"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[Role] = mapped_column(SqlEnum(Role, name="user_role"), nullable=False)
    organization_name: Mapped[str | None] = mapped_column(String(180), nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    donations: Mapped[list["Donation"]] = relationship(back_populates="donor")
    requests: Mapped[list["DonationRequest"]] = relationship(back_populates="ngo")
    pickups: Mapped[list["Pickup"]] = relationship(back_populates="volunteer")


class Donation(TimestampMixin, Base):
    __tablename__ = "food_donations"
    __table_args__ = (
        Index("ix_donations_status_expiry", "status", "expiry_time"),
        Index("ix_donations_category", "category"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    donor_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    quantity_unit: Mapped[str] = mapped_column(String(30), nullable=False)
    dietary: Mapped[str] = mapped_column(String(30), nullable=False)
    expiry_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    pickup_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    pickup_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    pickup_address: Mapped[str] = mapped_column(String(255), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    special_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[DonationStatus] = mapped_column(SqlEnum(DonationStatus, name="donation_status"), default=DonationStatus.AVAILABLE, nullable=False)

    donor: Mapped[User] = relationship(back_populates="donations")
    requests: Mapped[list["DonationRequest"]] = relationship(back_populates="donation", cascade="all, delete-orphan")
    pickup: Mapped["Pickup | None"] = relationship(back_populates="donation", uselist=False)


class DonationRequest(TimestampMixin, Base):
    __tablename__ = "donation_requests"
    __table_args__ = (UniqueConstraint("donation_id", "ngo_id", name="uq_donation_ngo_request"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    donation_id: Mapped[str] = mapped_column(ForeignKey("food_donations.id"), nullable=False, index=True)
    ngo_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    status: Mapped[RequestStatus] = mapped_column(SqlEnum(RequestStatus, name="request_status"), default=RequestStatus.PENDING, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    donation: Mapped[Donation] = relationship(back_populates="requests")
    ngo: Mapped[User] = relationship(back_populates="requests")


class Pickup(TimestampMixin, Base):
    __tablename__ = "pickup_assignments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    donation_id: Mapped[str] = mapped_column(ForeignKey("food_donations.id"), unique=True, nullable=False)
    volunteer_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    status: Mapped[PickupStatus] = mapped_column(SqlEnum(PickupStatus, name="pickup_status"), default=PickupStatus.ASSIGNED, nullable=False)
    recipient_name: Mapped[str] = mapped_column(String(180), default="Community partner", nullable=False)

    donation: Mapped[Donation] = relationship(back_populates="pickup")
    volunteer: Mapped[User] = relationship(back_populates="pickups")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(80), nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)