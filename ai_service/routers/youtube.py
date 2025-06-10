from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

router = APIRouter()

# Get API key from environment
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

class YouTubeSearchRequest(BaseModel):
    query: str
    max_results: int = 5

class YouTubeSearchResponse(BaseModel):
    video_titles: List[str]
    video_links: List[str]
    channel_names: List[str]

# Dictionary of search terms to real video IDs for common educational topics
MOCK_VIDEO_DATABASE = {
    "default": [
        ("Learning How to Learn | Barbara Oakley", "O96fE1E-rf8"),
        ("How to Study Effectively for School or College", "IlU-zDU6aQ0"),
        ("How to Learn Anything Fast", "Y_B6VADhY84"),
    ],
    "python": [
        ("Python Tutorial for Beginners", "_uQrJ0TkZlc"),
        ("Learn Python - Full Course for Beginners", "rfscVS0vtbw"),
        ("Python Crash Course", "kqtD5dpn9C8"),
    ],
    "javascript": [
        ("JavaScript Tutorial for Beginners", "W6NZfCO5SIk"),
        ("JavaScript Programming - Full Course", "jS4aFq5-91M"),
        ("JavaScript Crash Course For Beginners", "hdI2bqOjy3c"),
    ],
    "java": [
        ("Java Tutorial for Beginners", "eIrMbAQSU34"),
        ("Java Programming", "grEKMHGYyns"),
        ("Java Full Course", "xk4_1vDrzzo"),
    ],
    "html": [
        ("HTML Tutorial for Beginners", "qz0aGYrrlhU"),
        ("HTML Crash Course", "UB1O30fR-EE"),
        ("HTML Full Course", "pQN-pnXPaVg"),
    ],
    "css": [
        ("CSS Tutorial - Zero to Hero", "1Rs2ND1ryYc"),
        ("CSS Crash Course", "yfoY53QXEnI"),
        ("CSS Full Course", "1PnVor36_40"),
    ],
    "react": [
        ("React JS Crash Course", "w7ejDZ8SWv8"),
        ("React Tutorial for Beginners", "SqcY0GlETPk"),
        ("Learn React In 30 Minutes", "hQAHSlTtcmY"),
    ],
    "machine learning": [
        ("Machine Learning for Everybody", "i_LwzRVP7bg"),
        ("Machine Learning Full Course", "GwIo3gDZCVQ"),
        ("Machine Learning Basics", "ukzFI9rgwfU"),
    ],
    "data science": [
        ("Data Science Full Course", "-ETQ97mXXF0"),
        ("Learn Data Science Tutorial", "ua-CiDNNj30"),
        ("Data Science Roadmap", "y9AK3hzlGCM"),
    ],
}

@router.post("/YtSuggestion", response_model=YouTubeSearchResponse)
async def suggest_youtube_video(request: YouTubeSearchRequest):
    try:
        if not YOUTUBE_API_KEY:
            raise HTTPException(
                status_code=500,
                detail="YouTube API key not found. Please check your environment configuration."
            )

        # Initialize the YouTube API client
        youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)
        
        # Make the search request
        search_response = youtube.search().list(
            q=request.query,
            part="snippet",
            type="video",
            maxResults=min(request.max_results, 10),  # Cap at 10 results
            relevanceLanguage="en",  # Prefer English results
            safeSearch="strict"  # Use strict safe search
        ).execute()

        video_titles = []
        video_links = []
        channel_names = []

        # Process search results
        for item in search_response.get("items", []):
            if "id" in item and "videoId" in item["id"]:
                video_titles.append(item["snippet"]["title"])
                video_links.append(f"https://www.youtube.com/watch?v={item['id']['videoId']}")
                channel_names.append(item["snippet"]["channelTitle"])

        if not video_titles:
            raise HTTPException(
                status_code=404,
                detail="No videos found for your search query."
            )

        return YouTubeSearchResponse(
            video_titles=video_titles,
            video_links=video_links,
            channel_names=channel_names
        )

    except HttpError as e:
        # Handle YouTube API specific errors
        error_message = e.error_details[0]["message"] if e.error_details else str(e)
        raise HTTPException(
            status_code=e.resp.status,
            detail=f"YouTube API error: {error_message}"
        )
    except Exception as e:
        # Handle other errors
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred: {str(e)}"
        )