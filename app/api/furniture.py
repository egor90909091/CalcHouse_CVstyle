from fastapi import APIRouter, HTTPException

from typing import Dict, Optional
from pydantic import BaseModel

router = APIRouter()

class FurnitureRequest(BaseModel):
    style: str
    furniture: str
    max_items: Optional[int] = 5

@router.post("/furniture/search")
async def search_furniture(request: FurnitureRequest) -> Dict:
    try:
        from app.services.furniture_service import get_furniture_by_style, MarketplaceUnavailableError
        result = await get_furniture_by_style(request.style, request.furniture, request.max_items)
        return {"status": "success", "data": result}
    except MarketplaceUnavailableError:
        raise HTTPException(
            status_code=503,
            detail="Извините, маркетплейс Wildberries в данный момент недоступен. Попробуйте позже."
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 