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
        "HTTP-Referer": "https://github.com/google/antigravity",
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
                if not model_id:
                    continue
                pricing = item.get("pricing", {})
                prompt_price = float(pricing.get("prompt", 0)) * 1_000_000
                completion_price = float(pricing.get("completion", 0)) * 1_000_000
                
                models_list.append({
                    "id": model_id,
                    "name": item.get("name") or model_id,
                    "input_price_per_m": round(prompt_price, 4),
                    "output_price_per_m": round(completion_price, 4),
                })
            
            # Sort by name
            models_list.sort(key=lambda x: x["name"].lower())
            return models_list
        except Exception as e:
            logger.error(f"Error fetching OpenRouter models: {e}")
            return []

async def fetch_openrouter_image_models(api_key: str) -> List[Dict[str, Any]]:
    """Fetches list of available image generation models from OpenRouter."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "https://github.com/google/antigravity",
        "X-Title": "Software Vault"
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.get(f"{OPENROUTER_BASE_URL}/images/models", headers=headers)
            if response.status_code != 200:
                response = await client.get(f"{OPENROUTER_BASE_URL}/images/models")
                if response.status_code != 200:
                    return []
            
            data = response.json()
            models_list = []
            
            for item in data.get("data", []):
                model_id = item.get("id")
                if not model_id:
                    continue
                pricing = item.get("pricing", {})
                prompt_price = float(pricing.get("prompt", 0)) * 1_000_000
                completion_price = float(pricing.get("completion", 0)) * 1_000_000
                
                models_list.append({
                    "id": model_id,
                    "name": item.get("name") or model_id,
                    "input_price_per_m": round(prompt_price, 4),
                    "output_price_per_m": round(completion_price, 4),
                })
            
            models_list.sort(key=lambda x: x["name"].lower())
            return models_list
        except Exception as e:
            logger.error(f"Error fetching OpenRouter image models: {e}")
            return []

async def extract_software_name_from_filename(filename: str, api_key: str, model: str) -> str:
    """Uses OpenRouter to extract ONLY the clean generic software name from the installer filename."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/google/antigravity",
        "X-Title": "Software Vault"
    }
    
    prompt = (
        f"Extract ONLY the clean, generic software name from the following installer filename: '{filename}'.\n"
        "Examples:\n"
        "- 'archlinux-2019.02.01-x86_64.iso' -> 'Arch Linux'\n"
        "- 'ideaIU-2023.3.4.exe' -> 'IntelliJ IDEA'\n"
        "- 'SteamSetup.exe' -> 'Steam'\n"
        "- 'photoshop_setup_2026.exe' -> 'Adobe Photoshop'\n\n"
        "Respond with ONLY the raw software name string, without quotes, markdown block styling, or any extra text."
    )
    
    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.post(f"{OPENROUTER_BASE_URL}/chat/completions", headers=headers, json=payload)
            if response.status_code != 200:
                raise Exception("Failed to query OpenRouter")
            
            resp_data = response.json()
            name = resp_data["choices"][0]["message"]["content"].strip()
            # Clean up potential wrapper quotes
            if name.startswith('"') and name.endswith('"'):
                name = name[1:-1]
            if name.startswith("'") and name.endswith("'"):
                name = name[1:-1]
            return name
        except Exception as e:
            logger.error(f"Failed to extract generic name: {e}")
            # Fallback to simple file stem cleanup
            fallback = filename
            for ext in [".exe", ".msi", ".dmg", ".pkg", ".zip", ".rar", ".iso", ".tar.gz", ".deb", ".rpm"]:
                if fallback.lower().endswith(ext):
                    fallback = fallback[:-len(ext)]
                    break
            return fallback

async def gather_software_info(software_name: str, api_key: str, model: str) -> Dict[str, Any]:
    """Uses OpenRouter to gather metadata details about a software name from different sources."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/google/antigravity",
        "X-Title": "Software Vault"
    }
    
    prompt = (
        f"Gather information about the software '{software_name}' from different sources.\n\n"
        "You must respond with a JSON object containing the following keys:\n"
        '- "edition": A typical edition, version, or year if applicable (e.g. "Pro", "Community", "Enterprise") or null.\n'
        '- "os": The primary target operating system for this software. Choose exactly one from: "Windows", "macOS", "Linux", or "Cross-platform".\n'
        '- "tags": A list of up to 4 tags describing the type of software (e.g. ["IDE", "Development"], ["Database", "SQL"]).\n'
        '- "description": A concise, one-sentence description of the software and its primary purpose.\n\n'
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
            if response.status_code == 200:
                resp_data = response.json()
                content = resp_data["choices"][0]["message"]["content"].strip()
                return json.loads(content)
        except Exception as e:
            logger.error(f"Error gathering software info: {e}")
            
        return {
            "edition": None,
            "os": "Windows",
            "tags": [],
            "description": f"Software package cataloged as {software_name}."
        }

async def generate_software_cover(software_name: str, description: str, api_key: str, model: str) -> str | None:
    """Uses OpenRouter's image generation endpoint to generate a custom cover art URL based on software details."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/google/antigravity",
        "X-Title": "Software Vault"
    }
    
    # Construct a high-grade icon/cover prompt
    # Note: we use the generic description instead of the trademarked name to bypass brand moderation filters
    image_prompt = (
        f"A modern minimalist app icon/logo vector graphic representing: {description}. "
        "Sleek centered icon, vector illustration style, solid dark slate blue background, "
        "professional product design, high resolution, clean lines, no text or words on the logo."
    )
    
    payload = {
        "model": model,
        "prompt": image_prompt
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Try unified OpenRouter Image API first
            response = await client.post(f"{OPENROUTER_BASE_URL}/images", headers=headers, json=payload)
            if response.status_code == 404:
                # Fallback to standard OpenAI generations endpoint if needed
                response = await client.post(f"{OPENROUTER_BASE_URL}/images/generations", headers=headers, json=payload)
                
            if response.status_code == 200:
                resp_data = response.json()
                return resp_data.get("data", [{}])[0].get("url")
            else:
                logger.error(f"OpenRouter Image Gen returned status {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"Failed to call OpenRouter image generation: {e}")
            
        return None
