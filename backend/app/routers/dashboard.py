from datetime import datetime, timezone

from fastapi import APIRouter
from sqlalchemy import func, select

from ..deps import CurrentUser, DbSession
from ..models import Donation, DonationRequest, DonationStatus, Pickup, Role
from ..schemas import ActivityItem, DashboardSummaryResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
def summary(db: DbSession, user: CurrentUser):
    if user.role == Role.DONOR:
        primary = db.scalar(select(func.count()).select_from(Donation).where(Donation.donor_id == user.id)) or 0
        secondary = db.scalar(select(func.count()).select_from(Donation).where(Donation.donor_id == user.id, Donation.status == DonationStatus.COMPLETED)) or 0
        impact = secondary * 12
        labels = ("Donations shared", "Completed rescues", "Meals redirected")
    elif user.role == Role.NGO:
        primary = db.scalar(select(func.count()).select_from(DonationRequest).where(DonationRequest.ngo_id == user.id)) or 0
        secondary = db.scalar(select(func.count()).select_from(DonationRequest).where(DonationRequest.ngo_id == user.id, DonationRequest.status == "ACCEPTED")) or 0
        impact = secondary * 12
        labels = ("Requests submitted", "Accepted requests", "People supported")
    elif user.role == Role.VOLUNTEER:
        primary = db.scalar(select(func.count()).select_from(Pickup).where(Pickup.volunteer_id == user.id)) or 0
        secondary = db.scalar(select(func.count()).select_from(Pickup).where(Pickup.volunteer_id == user.id, Pickup.status == "DELIVERED")) or 0
        impact = secondary * 12
        labels = ("Pickup assignments", "Deliveries completed", "Meals delivered")
    else:
        primary = db.scalar(select(func.count()).select_from(Donation)) or 0
        secondary = db.scalar(select(func.count()).select_from(Donation).where(Donation.status == DonationStatus.COMPLETED)) or 0
        impact = secondary * 12
        labels = ("Total donations", "Completed rescues", "Meals redirected")
    return DashboardSummaryResponse(
        role=user.role,
        primary_metric=int(primary),
        primary_label=labels[0],
        secondary_metric=int(secondary),
        secondary_label=labels[1],
        impact_metric=int(impact),
        impact_label=labels[2],
        recent_activity=[
            ActivityItem(id="welcome", title="Welcome to FoodBridge", detail="Your next rescue starts with one thoughtful action.", timestamp=datetime.now(timezone.utc))
        ],
    )