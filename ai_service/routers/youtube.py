from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from googleapiclient.discovery import build
import os

router = APIRouter()

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")  # Or paste your API key as a string

class YouTubeSearchRequest(BaseModel):
    query: str
    max_results: int = 1

class YouTubeSearchResponse(BaseModel):
    video_titles: List[str]
    video_links: List[str]

@router.post("/YtSuggestion", response_model=YouTubeSearchResponse)
async def suggest_youtube_video(request: YouTubeSearchRequest):
    try:
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