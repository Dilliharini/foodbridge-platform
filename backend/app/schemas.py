from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from .models import DonationStatus, PickupStatus, RequestStatus, Role


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    role: Role
    organization_name: str | None = None
    verified: bool = False


class RegisterInput(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str
    password: str = Field(min_length=8)
    role: Literal[Role.DONOR, Role.NGO, Role.VOLUNTEER]
    organization_name: str | None = None


class LoginInput(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class DonationInput(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    description: str = Field(min_length=5)
    category: str
    quantity: float = Field(gt=0)
    quantity_unit: str
    dietary: Literal["vegetarian", "non-vegetarian"]
    expiry_time: datetime
    pickup_start: datetime
    pickup_end: datetime
    pickup_address: str
    image_url: str | None = None
    special_instructions: str | None = None


class DonationUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    quantity: float | None = Field(default=None, gt=0)
    quantity_unit: str | None = None
    dietary: Literal["vegetarian", "non-vegetarian"] | None = None
    expiry_time: datetime | None = None
    pickup_start: datetime | None = None
    pickup_end: datetime | None = None
    pickup_address: str | None = None
    image_url: str | None = None
    special_instructions: str | None = None


class DonationResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str
    quantity: float
    quantity_unit: str
    dietary: str
    expiry_time: datetime
    pickup_start: datetime
    pickup_end: datetime
    pickup_address: str
    image_url: str | None = None
    special_instructions: str | None = None
    status: DonationStatus
    donor_name: str
    donor_id: str
    request_count: int = 0
    created_at: datetime


class DonationPage(BaseModel):
    items: list[DonationResponse]
    page: int
    page_size: int
    total: int


class DonationRequestInput(BaseModel):
    donation_id: str
    message: str = Field(min_length=5)


class RequestDecisionInput(BaseModel):
    decision: Literal["accept", "reject"]


class DonationRequestResponse(BaseModel):
    id: str
    donation_id: str
    donation_title: str
    ngo_name: str
    status: RequestStatus
    message: str
    created_at: datetime


class PickupStatusInput(BaseModel):
    status: Literal[PickupStatus.ACCEPTED, PickupStatus.PICKED_UP, PickupStatus.DELIVERED]


class PickupResponse(BaseModel):
    id: str
    donation_id: str
    donation_title: str
    pickup_address: str
    status: PickupStatus
    pickup_window: str
    recipient_name: str


class ActivityItem(BaseModel):
    id: str
    title: str
    detail: str
    timestamp: datetime


class DashboardSummaryResponse(BaseModel):
    role: Role
    primary_metric: int
    primary_label: str
    secondary_metric: int
    secondary_label: str
    impact_metric: int
    impact_label: str
    recent_activity: list[ActivityItem]