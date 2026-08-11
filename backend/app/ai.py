import httpx
import json
import logging
from typing import List, Dict, Any
from . import schemas

logger = logging.getLogger(__name__)

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

async def verify_openrouter_key(api_key: str) -> bool:
    """Verifies OpenRouter API key using their auth/key endpoint."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "https://github.com/google/antigravity", # Required by OpenRouter
        "X-Title": "Software Vault"
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(f"{OPENROUTER_BASE_URL}/auth/key", headers=headers)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Error validating OpenRouter key: {e}")
            return False

async def fetch_openrouter_models(api_key: str) -> List[Dict[str, Any]]:
    """Fetches list of available models from OpenRouter with pricing info."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "https://github.com/google/antigravity",
        "X-Title": "Software Vault"
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.get(f"{OPENROUTER_BASE_URL}/models", headers=headers)
            if response.status_code != 200:
                return []
            
            data = response.json()
            models_list = []
            
            for item in data.get("data", []):
                model_id = item.get("id")
                if not model_id or ":batch" in model_id:
                    continue
                pricing = item.get("pricing", {})
                # OpenRouter pricing is typically represented as cost per 1 token.
                # Let's convert to price per 1M tokens to make it readable in UI.
                prompt_price = float(pricing.get("prompt", 0)) * 1_000_000
                completion_price = float(pricing.get("completion", 0)) * 1_000_000
                
                models_list.append({
                    "id": item.get("id"),
                    "name": item.get("name") or item.get("id"),
                    "input_price_per_m": round(prompt_price, 4),
                    "output_price_per_m": round(completion_price, 4),
                })
            
            # Sort by name
            models_list.sort(key=lambda x: x["name"].lower())
            return models_list
        except Exception as e:
            logger.error(f"Error fetching OpenRouter models: {e}")
            return []

async def extract_metadata_from_filename(filename: str, api_key: str, model: str) -> schemas.AIMetadataExtraction:
    """Uses OpenRouter to extract metadata (name, edition, OS, tags) from an installer filename."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/google/antigravity",
        "X-Title": "Software Vault"
    }
    
    prompt = (
        f"Extract metadata from the following software installer filename: '{filename}'.\n\n"
        "You must respond with a JSON object containing the following keys:\n"
        '- "name": The clean name of the software (e.g. "Adobe Photoshop", "Visual Studio Code").\n'
        '- "edition": The edition, version or year if present in filename (e.g. "2024", "Pro", "v1.92"). If not present, set to null.\n'
        '- "os": The target operating system. Choose from "Windows", "macOS", "Linux", or "Cross-platform" based on the filename characteristics (e.g. .exe/.msi is Windows, .dmg/.pkg is macOS, .tar.gz/.deb/.rpm is Linux).\n'
        '- "tags": A list of up to 4 tags describing the type of software (e.g. ["IDE", "Development", "Text Editor"], ["Design", "Graphics"], ["Utility"]).\n'
        '- "cover_url": A direct URL string to a high-quality public logo or application icon for this software. You should search your knowledge and look for direct links from Wikimedia Commons (e.g. upload.wikimedia.org/wikipedia/commons/...), Wikipedia/Wikimedia media paths, or official product asset paths. Ensure it is a direct image link ending in .png, .jpg, .jpeg, .svg, or .webp. If not found, set to null.\n\n'
        "Provide ONLY the raw JSON object, without markdown block formatting or any other text."
    )
    
    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"}
    }
    
    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            response = await client.post(f"{OPENROUTER_BASE_URL}/chat/completions", headers=headers, json=payload)
            if response.status_code != 200:
                logger.error(f"OpenRouter returned status {response.status_code}: {response.text}")
                raise Exception("Failed to call OpenRouter API")
            
            resp_data = response.json()
            content = resp_data["choices"][0]["message"]["content"].strip()
            
            # Parse json
            parsed = json.loads(content)
            
            return schemas.AIMetadataExtraction(
                name=parsed.get("name") or filename,
                edition=parsed.get("edition"),
                os=parsed.get("os") or "Windows",
                tags=parsed.get("tags") or [],
                cover_url=parsed.get("cover_url")
            )
        except Exception as e:
            logger.error(f"Failed to extract metadata using OpenRouter: {e}")
            # Return fallback defaults
            name_fallback = filename
            for ext in [".exe", ".msi", ".dmg", ".pkg", ".zip", ".rar", ".iso", ".tar.gz", ".deb", ".rpm"]:
                if name_fallback.lower().endswith(ext):
                    name_fallback = name_fallback[:-len(ext)]
                    break
                    
            os_fallback = "Windows"
            if ".dmg" in filename.lower() or ".pkg" in filename.lower():
                os_fallback = "macOS"
            elif any(ext in filename.lower() for ext in [".deb", ".rpm", ".tar.gz", ".sh"]):
                os_fallback = "Linux"
                
            return schemas.AIMetadataExtraction(
                name=name_fallback,
                edition=None,
                os=os_fallback,
                tags=[],
                cover_url=None
            )
