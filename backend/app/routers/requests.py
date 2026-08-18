from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from ..deps import CurrentUser, DbSession, require_roles
from ..models import Donation, DonationRequest, DonationStatus, RequestStatus, Role, User
from ..schemas import DonationRequestInput, DonationRequestResponse, RequestDecisionInput

router = APIRouter(prefix="/donation-requests", tags=["donation-requests"])


def serialize(request: DonationRequest) -> DonationRequestResponse:
    return DonationRequestResponse(
        id=request.id,
        donation_id=request.donation_id,
        donation_title=request.donation.title,
        ngo_name=request.ngo.organization_name or request.ngo.name,
        status=request.status,
        message=request.message,
        created_at=request.created_at,
    )


@router.get("", response_model=list[DonationRequestResponse])
def list_requests(db: DbSession, user: CurrentUser):
    query = select(DonationRequest).options(joinedload(DonationRequest.donation), joinedload(DonationRequest.ngo))
    if user.role == Role.NGO:
        query = query.where(DonationRequest.ngo_id == user.id)
    elif user.role == Role.DONOR:
        query = query.join(Donation).where(Donation.donor_id == user.id)
    elif user.role == Role.VOLUNTEER:
        return []
    return [serialize(item) for item in db.scalars(query.order_by(DonationRequest.created_at.desc())).unique().all()]


@router.post("", response_model=DonationRequestResponse, status_code=status.HTTP_201_CREATED)
def create_request(payload: DonationRequestInput, db: DbSession, user: User = Depends(require_roles(Role.NGO))):
    donation = db.scalar(select(Donation).where(Donation.id == payload.donation_id).with_for_update())
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    if donation.status not in [DonationStatus.AVAILABLE, DonationStatus.REQUESTED]:
        raise HTTPException(status_code=409, detail="This donation is no longer available")
    existing = db.scalar(select(DonationRequest).where(DonationRequest.donation_id == donation.id, DonationRequest.ngo_id == user.id))
    if existing:
        raise HTTPException(status_code=409, detail="You have already requested this donation")
    request = DonationRequest(donation_id=donation.id, ngo_id=user.id, message=payload.message)
    donation.status = DonationStatus.REQUESTED
    db.add(request)
    db.commit()
    db.refresh(request)
    request.donation = donation
    request.ngo = user
    return serialize(request)


@router.patch("/{request_id}/decision", response_model=DonationRequestResponse)
def decide_request(request_id: str, payload: RequestDecisionInput, db: DbSession, user: CurrentUser):
    request = db.scalar(select(DonationRequest).options(joinedload(DonationRequest.donation), joinedload(DonationRequest.ngo)).where(DonationRequest.id == request_id).with_for_update())
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    if request.donation.donor_id != user.id or user.role != Role.DONOR:
        raise HTTPException(status_code=403, detail="Only the donor can decide requests")
    if request.status != RequestStatus.PENDING:
        raise HTTPException(status_code=409, detail="This request has already been decided")
    request.status = RequestStatus.ACCEPTED if payload.decision == "accept" else RequestStatus.REJECTED
    if request.status == RequestStatus.ACCEPTED:
        request.donation.status = DonationStatus.ACCEPTED
        for other in request.donation.requests:
            if other.id != request.id and other.status == RequestStatus.PENDING:
                other.status = RequestStatus.REJECTED
    elif not any(item.status == RequestStatus.PENDING and item.id != request.id for item in request.donation.requests):
        request.donation.status = DonationStatus.AVAILABLE
    db.commit()
    return serialize(request)