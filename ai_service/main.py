from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from dotenv import load_dotenv
import os
import logging
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = FastAPI()

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

# Configure CORS middleware with simplified settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Add error handler for debugging
@app.middleware("http")
async def log_errors(request: Request, call_next):
    try:
        response = await call_next(request)
        # Log successful preflight requests
        if request.method == "OPTIONS":
            logger.info(f"Successful OPTIONS request to {request.url}")
            logger.info(f"Response headers: {dict(response.headers)}")
        return response
    except Exception as e:
        logger.error(f"Error processing request: {request.method} {request.url}")
        logger.error(f"Headers: {dict(request.headers)}")
        logger.error(f"Error: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={"detail": str(e)}
        )

# Health check endpoint with CORS debugging info
@app.get("/health")
async def health_check(request: Request):
    cors_debug = {
        "origin": request.headers.get("origin"),
        "method": request.method,
        "headers": dict(request.headers)
    }
    logger.info("Health check request: %s", cors_debug)
    return {
        "status": "ok",
        "message": "AI service is running",
        "cors_debug": cors_debug
    }

# Import and register routers
from routers import youtube
app.include_router(youtube.router)

# Add the summarizer router
from routers import summarizer
app.include_router(summarizer.router)

# Log startup configuration
@app.on_event("startup")
async def startup_event():
    logger.info("Starting AI service with CORS configuration:")
    logger.info("Allowed origins: %s", origins)
    logger.info("CORS credentials enabled: True")
    logger.info("Allowed methods: All (*)")
    logger.info("Allowed headers: All (*)")
