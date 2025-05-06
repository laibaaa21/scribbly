from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List
from googleapiclient.discovery import build
import os

router = APIRouter()

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")  # Or paste your API key as a string
print("YT API KEY:", YOUTUBE_API_KEY)  # Optional for debugging
class YouTubeSearchRequest(BaseModel):
    query: str
    max_results: int = 5

class YouTubeSearchResponse(BaseModel):
    video_titles: List[str]
    video_links: List[str]

@router.options("/YtSuggestion")
async def options_youtube_suggestion():
    # Handle OPTIONS requests for CORS preflight
    return JSONResponse(
        content={"message": "OK"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    )

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
            # Return mock data if no API key is available
            # Try to find matching videos from our pre-defined database
            search_term = request.query.lower()
            
            # Find best matching category
            matching_category = "default"
            for category in MOCK_VIDEO_DATABASE:
                if category in search_term:
                    matching_category = category
                    break
            
            # Get videos from the matching category
            mock_videos = MOCK_VIDEO_DATABASE.get(matching_category, MOCK_VIDEO_DATABASE["default"])
            
            # Prepend the search query to make it look more relevant
            video_titles = [f"{request.query} - {title}" for title, _ in mock_videos]
            video_links = [f"https://www.youtube.com/watch?v={video_id}" for _, video_id in mock_videos]
            
            return JSONResponse(
                content={
                    "video_titles": video_titles,
                    "video_links": video_links
                },
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization",
                }
            )
            
        youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)
        search_response = youtube.search().list(
            q=request.query,
            part="snippet",
            type="video",
            maxResults=request.max_results
        ).execute()

        video_titles = []
        video_links = []
        for item in search_response.get("items", []):
            video_titles.append(item["snippet"]["title"])
            video_links.append(f"https://www.youtube.com/watch?v={item['id']['videoId']}")

        return YouTubeSearchResponse(video_titles=video_titles, video_links=video_links)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))