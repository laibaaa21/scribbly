from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
from models.model_factory import ModelFactory
from auth.auth_handler import get_current_user, SECRET_KEY
import jwt
import traceback

router = APIRouter(
    prefix="/models",
    tags=["models"]
)

class ModelInfo(BaseModel):
    id: str
    name: str
    description: str
    max_tokens: int
    provider: str

class GenerateRequest(BaseModel):
    prompt: str
    model_id: str
    parameters: Optional[Dict] = None

@router.get("/available", response_model=List[ModelInfo])
async def get_available_models(request: Request, current_user: Dict = Depends(get_current_user)):
    """Get list of available models based on user's subscription tier."""
    try:
        print("\n=== Models Route Debug ===")
        print("Request path:", request.url.path)
        print("Request method:", request.method)
        print("Request headers:", dict(request.headers))
        print("Auth header:", request.headers.get("authorization"))
        print("Current user data:", current_user)
        
        subscription_tier = current_user.get("subscription_tier", "personal")
        print(f"User tier: {subscription_tier}")
        
        try:
            models = ModelFactory.get_available_models(subscription_tier)
            print(f"Retrieved models: {models}")
            print("=== End Models Route Debug ===\n")
            return models
            
        except Exception as model_error:
            print(f"Error in ModelFactory: {str(model_error)}")
            print(f"Error type: {type(model_error).__name__}")
            print(traceback.format_exc())
            raise HTTPException(
                status_code=500,
                detail=f"Model factory error: {str(model_error)}"
            )
            
    except HTTPException as http_error:
        print(f"HTTP error in get_available_models: {str(http_error)}")
        print(f"Status code: {http_error.status_code}")
        print(f"Detail: {http_error.detail}")
        raise
    except Exception as e:
        print(f"Unexpected error in get_available_models: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Server error: {str(e)}"
        )

@router.post("/generate")
async def generate_text(
    request: Request,
    generate_request: GenerateRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Generate text using the selected model."""
    try:
        print(f"Generate request for model: {generate_request.model_id}")
        subscription_tier = current_user.get("subscription_tier", "personal")
        
        try:
            model = ModelFactory.get_model(generate_request.model_id, subscription_tier)
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))
        except Exception as model_error:
            raise HTTPException(
                status_code=500,
                detail=f"Error initializing model: {str(model_error)}"
            )
        
        # Add user-specific parameters
        parameters = generate_request.parameters or {}
        parameters["max_tokens"] = min(
            parameters.get("max_tokens", 1024),
            model.get_model_info()["max_tokens"]
        )
        
        result = model.generate(generate_request.prompt, **parameters)
        return {"result": result}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in generate_text: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test-auth")
async def test_auth(request: Request):
    """Test endpoint to debug token validation."""
    try:
        print("\n=== Test Auth Debug ===")
        auth_header = request.headers.get("authorization")
        if not auth_header:
            return {"error": "No authorization header"}
        
        if not auth_header.startswith("Bearer "):
            return {"error": "Invalid authorization header format"}
            
        token = auth_header.replace("Bearer ", "")
        
        # First, decode without verification to inspect the payload
        decoded_unverified = decode_jwt_without_verification(token)
        print("Token structure (unverified):", decoded_unverified)
        
        try:
            # Try to decode and verify the token
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            print("Successfully verified token!")
            print("Verified payload:", payload)
            return {
                "status": "success",
                "unverified_decode": decoded_unverified,
                "verified_payload": payload
            }
        except jwt.InvalidSignatureError:
            print("Invalid token signature")
            return {"error": "Invalid token signature", "unverified_decode": decoded_unverified}
        except jwt.ExpiredSignatureError:
            print("Token has expired")
            return {"error": "Token has expired", "unverified_decode": decoded_unverified}
        except Exception as e:
            print(f"JWT verification error: {str(e)}")
            return {"error": f"Token verification failed: {str(e)}", "unverified_decode": decoded_unverified}
            
    except Exception as e:
        print(f"Test auth error: {str(e)}")
        return {"error": f"Test failed: {str(e)}"} 