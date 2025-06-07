from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Dict
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

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None

def decode_jwt_without_verification(token: str) -> dict:
    """Decode JWT without verification to inspect payload"""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return {"error": "Token does not have three parts"}
        
        # Decode header and payload
        header = json.loads(base64.urlsafe_b64decode(parts[0] + '=' * (-len(parts[0]) % 4)).decode())
        payload = json.loads(base64.urlsafe_b64decode(parts[1] + '=' * (-len(parts[1]) % 4)).decode())
        
        return {
            "header": header,
            "payload": payload,
            "signature_part": parts[2][:10] + "..."  # Show first 10 chars of signature
        }
    except Exception as e:
        return {"error": f"Failed to decode token: {str(e)}"}

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "id": data.get("sub"),  # Add id field to match frontend expectation
        "subscription_tier": data.get("subscription_tier", "personal")  # Default to personal tier
    })
    try:
        print("\nCreating new token:")
        print(f"Payload: {to_encode}")
        print(f"Using SECRET_KEY (first 10 chars): {SECRET_KEY[:10] if SECRET_KEY else 'Not set'}")
        print(f"Algorithm: {ALGORITHM}")
        
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        
        # Debug: Decode the token we just created to verify it
        debug_decode = decode_jwt_without_verification(encoded_jwt)
        print(f"Decoded token for verification: {debug_decode}")
        
        return encoded_jwt
    except Exception as e:
        print(f"Error creating token: {str(e)}")
        raise

async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict:
    print("\n=== Token Validation Debug ===")
    print(f"Received token (first 20 chars): {token[:20]}...")
    print(f"Using SECRET_KEY (first 10 chars): {SECRET_KEY[:10] if SECRET_KEY else 'Not set'}")
    
    # Debug: Decode token without verification
    debug_decode = decode_jwt_without_verification(token)
    print(f"Token structure: {debug_decode}")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        print("\nAttempting to decode and verify JWT token...")
        print(f"Token being verified: {token[:50]}...")
        print(f"Algorithm being used: {ALGORITHM}")
        
        # First try to decode without verification to check structure
        unverified_payload = decode_jwt_without_verification(token)
        print("Unverified payload structure:", unverified_payload)
        
        # Now verify and decode
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"Successfully decoded payload: {payload}")
        
        # Check for user identifier in multiple fields
        user_id = None
        if "sub" in payload:
            user_id = payload["sub"]
            print("Found user_id in 'sub' field:", user_id)
        elif "id" in payload:
            user_id = payload["id"]
            print("Found user_id in 'id' field:", user_id)
        
        if not user_id:
            print("No valid user identifier found in token")
            print("Available fields:", list(payload.keys()))
            raise credentials_exception
            
        # Get subscription tier from token or default to personal
        subscription_tier = payload.get("subscription_tier", "personal")
        
        user_data = {
            "id": user_id,
            "subscription_tier": subscription_tier
        }
        print(f"Returning user data: {user_data}")
        print("=== End Token Validation ===\n")
        return user_data
        
    except jwt.ExpiredSignatureError:
        print("Token has expired")
        print("Token expiry time:", payload.get("exp") if 'payload' in locals() else "Unknown")
        print("Current time:", datetime.utcnow())
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidSignatureError:
        print("Invalid token signature")
        print("Token header:", debug_decode.get("header"))
        print("Expected algorithm:", ALGORITHM)
        raise credentials_exception
    except jwt.PyJWTError as e:
        print(f"JWT Error: {str(e)}")
        print(f"Token being verified: {token}")
        print(f"JWT Error type: {type(e).__name__}")
        raise credentials_exception
    except Exception as e:
        print(f"Unexpected error in get_current_user: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        print(f"Error args: {e.args}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication error: {str(e)}"
        )

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        print("\n=== Token Generation Debug ===")
        print(f"Creating token for username: {form_data.username}")
        
        access_token = create_access_token(
            data={"sub": form_data.username}
        )
        
        # Debug: Verify the token we just created
        debug_decode = decode_jwt_without_verification(access_token)
        print(f"Generated token structure: {debug_decode}")
        print("=== End Token Generation ===\n")
        
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        print(f"Error in login_for_access_token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating access token: {str(e)}"
        ) 