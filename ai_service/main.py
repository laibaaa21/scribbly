from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routers import summarizer, youtube, model_selector
from auth.auth_handler import router as auth_router
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
print("LOADING .env...")
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
print("YT API KEY:", os.getenv("YOUTUBE_API_KEY"))

app = FastAPI()

# Configure CORS
origins = [
    "http://localhost:3000",  # React development server
    "http://localhost:5000",  # Express backend
    "http://localhost:8000",  # FastAPI backend
    "http://localhost:8080",  # Alternative development port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include routers
app.include_router(auth_router)
app.include_router(summarizer.router)
app.include_router(youtube.router)
app.include_router(model_selector.router)

@app.get("/")
async def root():
    return {"message": "Welcome to the AI Service API"}

# Add middleware to log all requests
@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"\n--- Request ---")
    print(f"Method: {request.method}")
    print(f"URL: {request.url}")
    print(f"Headers: {dict(request.headers)}")
    print(f"Origin: {request.headers.get('origin')}")
    print(f"Authorization: {request.headers.get('authorization', 'No auth header')[:20]}...")
    
    response = await call_next(request)
    
    print(f"\n--- Response ---")
    print(f"Status: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    
    return response
