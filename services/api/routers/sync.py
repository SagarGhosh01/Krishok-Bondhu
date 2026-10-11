"""
AgriShield AI - Idempotent Offline Batch Synchronization Router
Allows mobile PWAs to sync scans captured in the field with client-generated UUIDs.
Guarantees duplicate-safety upon retry or network flakiness.
"""

import base64
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from services.api.database.connection import get_db
from services.api.database.models import User, Scan
from services.api.routers.auth import get_current_user_optional
from services.api.schemas.sync import (
    SyncBatchRequest,
    SyncBatchResponse,
    SyncItemStatus,
)
from services.api.services.prediction_service import PredictionService

router = APIRouter(prefix="/sync", tags=["Offline Synchronization"])


@router.post("", response_model=SyncBatchResponse)
def sync_offline_scans(
    batch: SyncBatchRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Synchronizes a batch of scans captured while offline.
    Uses client_uuid for idempotency: if a client_uuid was already processed,
    it returns the existing record without duplicating work or database rows.
    """
    user_id = current_user.id if current_user else None
    prediction_svc = PredictionService.get_instance()

    results = []
    sync_count = 0
    dup_count = 0

    for item in batch.items:
        # 1. Idempotency Check
        existing_scan = db.query(Scan).filter(Scan.client_uuid == item.client_uuid).first()
        if existing_scan:
            dup_count += 1
            results.append(
                SyncItemStatus(
                    client_uuid=item.client_uuid,
                    scan_id=existing_scan.id,
                    status="duplicate_skipped",
                    message="Scan was already synchronized previously.",
                )
            )
            continue

        # 2. Process new scan
        try:
            # Handle base64 with or without data URI header
            b64_str = item.image_base64
            if "," in b64_str:
                b64_str = b64_str.split(",", 1)[1]

            image_bytes = base64.b64decode(b64_str)

            pred_res = prediction_svc.predict(
                image_bytes=image_bytes,
                original_filename=item.filename or f"offline_{item.client_uuid[:8]}.jpg",
                db=db,
                user_id=user_id,
                farm_id=item.farm_id,
                selected_crop=item.selected_crop,
                client_uuid=item.client_uuid,
                is_offline_captured=True,
            )

            sync_count += 1
            results.append(
                SyncItemStatus(
                    client_uuid=item.client_uuid,
                    scan_id=pred_res.scan_id,
                    status="synchronized",
                    message="Scan successfully verified and synchronized to cloud.",
                )
            )
        except Exception as e:
            results.append(
                SyncItemStatus(
                    client_uuid=item.client_uuid,
                    scan_id=None,
                    status="error",
                    message=f"Sync error: {str(e)}",
                )
            )

    return SyncBatchResponse(
        total_received=len(batch.items),
        synchronized_count=sync_count,
        duplicate_count=dup_count,
        results=results,
    )
