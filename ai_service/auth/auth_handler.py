from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import JSONResponse
from typing import Dict, Optional
import jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from pydantic import BaseModel
import base64
import json

# Load environment variables from .env file
load_dotenv()

# Get the secret key from environment variables
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-here")
print(f"Loaded JWT_SECRET_KEY (first 10 chars): {SECRET_KEY[:10] if SECRET_KEY else 'Not set'}")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

# Configure OAuth2 without automatic redirect
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="auth/token",
    auto_error=False  # Don't automatically raise errors
)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None

async def get_token_from_request(request: Request) -> Optional[str]:
    """Extract token from request headers or query parameters"""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.replace("Bearer ", "")
    return None

async def get_current_user(request: Request, token: str = Depends(oauth2_scheme)) -> Dict:
    """Get current user from token with better error handling"""
    print("\n=== Token Validation Debug ===")
    
    # Try to get token from request if not provided through oauth2_scheme
    if not token:
        token = await get_token_from_request(request)
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authentication token provided",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    print(f"Validating token (first 20 chars): {token[:20]}...")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub") or payload.get("id")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token content"
            )
            
        subscription_tier = payload.get("subscription_tier", "personal")
        if subscription_tier not in ["personal", "corporate"]:
            subscription_tier = "personal"
            
        return {
            "id": user_id,
            "subscription_tier": subscription_tier
        }
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    except Exception as e:
        print(f"Unexpected error in get_current_user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication error"
        )

def create_access_token(data: dict) -> str:
    """Create a new access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "id": data.get("sub"),
        "subscription_tier": data.get("subscription_tier", "personal")
    })
    
    try:
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    except Exception as e:
        print(f"Error creating token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating access token"
        )

@router.post("/token", response_model=Token)
async def login_for_access_token(request: Request):
    """Handle login and token generation"""
    try:
        form_data = await request.json()
        username = form_data.get("username")
        password = form_data.get("password")
        
        if not username or not password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing username or password"
            )
        
        # Here you would verify the user credentials
        subscription_tier = get_user_subscription_tier(username)
        
        access_token = create_access_token({
            "sub": username,
            "subscription_tier": subscription_tier
        })
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

def get_user_subscription_tier(username: str) -> str:
    """Get user's subscription tier - replace with actual database lookup"""
    return "personal" 