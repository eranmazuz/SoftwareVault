from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import crud, schemas, ai, config

router = APIRouter(prefix="/api/settings", tags=["settings"])

@router.get("", response_model=dict)
def get_all_settings(db: Session = Depends(get_db)):
    # Retrieve from DB, or fallback to environment variables
    api_key = crud.get_setting(db, "openrouter_api_key") or config.settings.OPENROUTER_API_KEY
    model = crud.get_setting(db, "openrouter_model") or config.settings.OPENROUTER_MODEL
    
    # Hide API key except first/last few chars for security
    masked_key = None
    if api_key:
        masked_key = api_key if len(api_key) <= 10 else f"{api_key[:6]}...{api_key[-4:]}"

    return {
        "openrouter_api_key_configured": api_key is not None,
        "openrouter_api_key_masked": masked_key,
        "openrouter_model": model,
        "library_path": config.settings.LIBRARY_PATH
    }

@router.post("", response_model=dict)
def update_settings(payload: dict, db: Session = Depends(get_db)):
    if "openrouter_api_key" in payload:
        # If payload contains a masked key or empty, we check if we should keep the existing key
        val = payload["openrouter_api_key"]
        if val is not None and "..." in val:
            # Masked, keep existing
            pass
        else:
            crud.set_setting(db, "openrouter_api_key", val)
            
    if "openrouter_model" in payload:
        crud.set_setting(db, "openrouter_model", payload["openrouter_model"])
        
    return {"status": "success"}

@router.post("/connect", response_model=dict)
async def test_and_connect(payload: dict, db: Session = Depends(get_db)):
    api_key = payload.get("openrouter_api_key")
    
    # Resolve if masked
    if api_key and "..." in api_key:
        api_key = crud.get_setting(db, "openrouter_api_key") or config.settings.OPENROUTER_API_KEY
        
    if not api_key:
        raise HTTPException(status_code=400, detail="API key is required to connect")
        
    is_valid = await ai.verify_openrouter_key(api_key)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid API Key or connection failed")
        
    # Save the key since it is valid
    if "..." not in payload.get("openrouter_api_key", ""):
        crud.set_setting(db, "openrouter_api_key", api_key)
        
    # Fetch models
    models_list = await ai.fetch_openrouter_models(api_key)
    
    return {
        "connected": True,
        "models": models_list
    }

@router.get("/models", response_model=list)
async def get_models(db: Session = Depends(get_db)):
    api_key = crud.get_setting(db, "openrouter_api_key") or config.settings.OPENROUTER_API_KEY
    if not api_key:
        return []
    models_list = await ai.fetch_openrouter_models(api_key)
    return models_list
