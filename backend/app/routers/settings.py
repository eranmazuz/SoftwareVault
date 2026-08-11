from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import crud, schemas, ai, config

router = APIRouter(prefix="/api/settings", tags=["settings"])

@router.get("", response_model=dict)
def get_all_settings(db: Session = Depends(get_db)):
    api_key = crud.get_setting(db, "openrouter_api_key") or config.settings.OPENROUTER_API_KEY
    data_model = crud.get_setting(db, "openrouter_data_model") or config.settings.OPENROUTER_DATA_MODEL
    cover_model = crud.get_setting(db, "openrouter_cover_model") or config.settings.OPENROUTER_COVER_MODEL
    
    masked_key = None
    if api_key:
        masked_key = api_key if len(api_key) <= 10 else f"{api_key[:6]}...{api_key[-4:]}"

    return {
        "openrouter_api_key_configured": api_key is not None,
        "openrouter_api_key_masked": masked_key,
        "openrouter_data_model": data_model,
        "openrouter_cover_model": cover_model,
        "library_path": config.settings.LIBRARY_PATH
    }

@router.post("", response_model=dict)
def update_settings(payload: dict, db: Session = Depends(get_db)):
    if "openrouter_api_key" in payload:
        val = payload["openrouter_api_key"]
        if val is not None and "..." in val:
            pass
        else:
            crud.set_setting(db, "openrouter_api_key", val)
            
    if "openrouter_data_model" in payload:
        crud.set_setting(db, "openrouter_data_model", payload["openrouter_data_model"])
        
    if "openrouter_cover_model" in payload:
        crud.set_setting(db, "openrouter_cover_model", payload["openrouter_cover_model"])
        
    return {"status": "success"}

@router.post("/connect", response_model=dict)
async def test_and_connect(payload: dict, db: Session = Depends(get_db)):
    api_key = payload.get("openrouter_api_key")
    
    if api_key and "..." in api_key:
        api_key = crud.get_setting(db, "openrouter_api_key") or config.settings.OPENROUTER_API_KEY
        
    if not api_key:
        raise HTTPException(status_code=400, detail="API key is required to connect")
        
    is_valid = await ai.verify_openrouter_key(api_key)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid API Key or connection failed")
        
    if "..." not in payload.get("openrouter_api_key", ""):
        crud.set_setting(db, "openrouter_api_key", api_key)
        
    # Fetch separate model types from OpenRouter
    data_models = await ai.fetch_openrouter_models(api_key)
    cover_models = await ai.fetch_openrouter_image_models(api_key)
    
    # Prepend dynamic disabled option
    cover_models.insert(0, {
        "id": "none",
        "name": "Do Not Generate Cover",
        "input_price_per_m": 0.0,
        "output_price_per_m": 0.0
    })
    
    return {
        "connected": True,
        "models": {
            "data_models": data_models,
            "cover_models": cover_models
        }
    }

@router.get("/models", response_model=dict)
async def get_models(db: Session = Depends(get_db)):
    api_key = crud.get_setting(db, "openrouter_api_key") or config.settings.OPENROUTER_API_KEY
    if not api_key:
        return {"data_models": [], "cover_models": []}
        
    data_models = await ai.fetch_openrouter_models(api_key)
    cover_models = await ai.fetch_openrouter_image_models(api_key)
    
    cover_models.insert(0, {
        "id": "none",
        "name": "Do Not Generate Cover",
        "input_price_per_m": 0.0,
        "output_price_per_m": 0.0
    })
    
    return {
        "data_models": data_models,
        "cover_models": cover_models
    }
