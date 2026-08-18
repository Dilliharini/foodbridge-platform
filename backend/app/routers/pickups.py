from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from ..deps import CurrentUser, DbSession, require_roles
from ..models import DonationStatus, Pickup, PickupStatus, Role, User
from ..schemas import PickupResponse, PickupStatusInput

router = APIRouter(prefix="/pickups", tags=["pickups"])


def serialize(pickup: Pickup) -> PickupResponse:
    return PickupResponse(
        id=pickup.id,
        donation_id=pickup.donation_id,
        donation_title=pickup.donation.title,
        pickup_address=pickup.donation.pickup_address,
        status=pickup.status,
        pickup_window=f"{pickup.donation.pickup_start:%b %-d, %H:%M} – {pickup.donation.pickup_end:%H:%M}",
        recipient_name=pickup.recipient_name,
    )


@router.get("", response_model=list[PickupResponse])
def list_pickups(db: DbSession, user: CurrentUser):
    query = select(Pickup).options(joinedload(Pickup.donation))
    if user.role == Role.VOLUNTEER:
        query = query.where(Pickup.volunteer_id == user.id)
    elif user.role != Role.ADMIN:
        return []
    return [serialize(item) for item in db.scalars(query.order_by(Pickup.created_at.desc())).unique().all()]


@router.patch("/{pickup_id}/status", response_model=PickupResponse)
def update_pickup_status(pickup_id: str, payload: PickupStatusInput, db: DbSession, user: User = Depends(require_roles(Role.VOLUNTEER))):
    pickup = db.scalar(select(Pickup).options(joinedload(Pickup.donation)).where(Pickup.id == pickup_id))
    if not pickup or pickup.volunteer_id != user.id:
        raise HTTPException(status_code=404, detail="Pickup not found")
    allowed = {
        PickupStatus.ASSIGNED: [PickupStatus.ACCEPTED],
        PickupStatus.ACCEPTED: [PickupStatus.PICKED_UP],
        PickupStatus.PICKED_UP: [PickupStatus.DELIVERED],
        PickupStatus.DELIVERED: [],
    }
    if payload.status not in allowed[pickup.status]:
        raise HTTPException(status_code=409, detail="Invalid pickup status transition")
    pickup.status = payload.status
    pickup.donation.status = {
        PickupStatus.PICKED_UP: DonationStatus.PICKED_UP,
        PickupStatus.DELIVERED: DonationStatus.COMPLETED,
    }.get(payload.status, DonationStatus.PICKUP_ASSIGNED)
    db.commit()
    return serialize(pickup)