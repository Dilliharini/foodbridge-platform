from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import joinedload

from ..deps import CurrentUser, DbSession, require_roles
from ..models import Donation, DonationRequest, DonationStatus, RequestStatus, Role, User
from ..schemas import DonationInput, DonationPage, DonationResponse, DonationUpdate

router = APIRouter(prefix="/donations", tags=["donations"])


def serialize(donation: Donation) -> DonationResponse:
    return DonationResponse(
        id=donation.id,
        title=donation.title,
        description=donation.description,
        category=donation.category,
        quantity=float(donation.quantity),
        quantity_unit=donation.quantity_unit,
        dietary=donation.dietary,
        expiry_time=donation.expiry_time,
        pickup_start=donation.pickup_start,
        pickup_end=donation.pickup_end,
        pickup_address=donation.pickup_address,
        image_url=donation.image_url,
        special_instructions=donation.special_instructions,
        status=donation.status,
        donor_name=donation.donor.name,
        donor_id=donation.donor_id,
        request_count=len(donation.requests),
        created_at=donation.created_at,
    )


@router.get("", response_model=DonationPage)
def list_donations(
    db: DbSession,
    user: CurrentUser,
    q: str | None = None,
    category: str | None = None,
    dietary: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=50),
):
    query = select(Donation).options(joinedload(Donation.donor), joinedload(Donation.requests))
    if user.role == Role.DONOR:
        query = query.where(Donation.donor_id == user.id)
    elif user.role == Role.NGO:
        query = query.where(Donation.status.in_([DonationStatus.AVAILABLE, DonationStatus.REQUESTED]))
    if q:
        term = f"%{q.strip()}%"
        query = query.where(or_(Donation.title.ilike(term), Donation.description.ilike(term), Donation.pickup_address.ilike(term)))
    if category:
        query = query.where(Donation.category == category)
    if dietary and dietary != "all":
        query = query.where(Donation.dietary == dietary)
    if status_filter:
        query = query.where(Donation.status == status_filter)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(query.order_by(Donation.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).unique().all()
    return DonationPage(items=[serialize(item) for item in items], page=page, page_size=page_size, total=total)


@router.post("", response_model=DonationResponse, status_code=status.HTTP_201_CREATED)
def create_donation(payload: DonationInput, db: DbSession, user: User = Depends(require_roles(Role.DONOR))):
    donation = Donation(**payload.model_dump(), donor_id=user.id, status=DonationStatus.AVAILABLE)
    db.add(donation)
    db.commit()
    db.refresh(donation)
    donation.donor = user
    return serialize(donation)


@router.get("/{donation_id}", response_model=DonationResponse)
def get_donation(donation_id: str, db: DbSession, user: CurrentUser):
    donation = db.scalar(select(Donation).options(joinedload(Donation.donor), joinedload(Donation.requests)).where(Donation.id == donation_id))
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    if user.role == Role.DONOR and donation.donor_id != user.id and user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="You cannot view this donation")
    return serialize(donation)


@router.patch("/{donation_id}", response_model=DonationResponse)
def update_donation(donation_id: str, payload: DonationUpdate, db: DbSession, user: CurrentUser):
    donation = db.scalar(select(Donation).options(joinedload(Donation.donor), joinedload(Donation.requests)).where(Donation.id == donation_id))
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    if donation.donor_id != user.id or user.role != Role.DONOR:
        raise HTTPException(status_code=403, detail="Only the donor can edit this donation")
    if donation.status not in [DonationStatus.AVAILABLE, DonationStatus.REQUESTED]:
        raise HTTPException(status_code=409, detail="This donation can no longer be edited")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(donation, key, value)
    db.commit()
    db.refresh(donation)
    return serialize(donation)


@router.delete("/{donation_id}", response_model=DonationResponse)
def cancel_donation(donation_id: str, db: DbSession, user: CurrentUser):
    donation = db.scalar(select(Donation).options(joinedload(Donation.donor), joinedload(Donation.requests)).where(Donation.id == donation_id))
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    if donation.donor_id != user.id or user.role != Role.DONOR:
        raise HTTPException(status_code=403, detail="Only the donor can cancel this donation")
    if donation.status not in [DonationStatus.AVAILABLE, DonationStatus.REQUESTED]:
        raise HTTPException(status_code=409, detail="This donation can no longer be cancelled")
    donation.status = DonationStatus.CANCELLED
    for request in donation.requests:
        if request.status == RequestStatus.PENDING:
            request.status = RequestStatus.CANCELLED
    db.commit()
    db.refresh(donation)
    return serialize(donation)