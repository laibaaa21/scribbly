from fastapi import FastAPI
from routers import summarizer, mindmap, ocr, tts, youtube
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
print("LOADING .env...")
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
print("YT API KEY:", os.getenv("YOUTUBE_API_KEY"))
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

app.include_router(summarizer.router, prefix="/api")
app.include_router(mindmap.router, prefix="/api")
app.include_router(ocr.router, prefix="/api")
app.include_router(tts.router, prefix="/api")
app.include_router(youtube.router, prefix="/api")
