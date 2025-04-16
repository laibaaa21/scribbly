from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
from keybert import KeyBERT

router = APIRouter()
kw_model = KeyBERT()

class MindmapRequest(BaseModel):
    text: str
    max_depth: Optional[int] = 3

@router.post("/Mindmap-gen")
async def generate_mindmap(request: MindmapRequest):
    try:
        # Extract keywords
        keywords = kw_model.extract_keywords(request.text, keyphrase_ngram_range=(1, 2), stop_words='english', top_n=5)
        # Build a simple mindmap structure
        mindmap = {
            "id": "root",
            "text": "Main Topic",
            "children": [
                {
                    "id": f"child{i+1}",
                    "text": kw[0],
                    "children": []
                } for i, kw in enumerate(keywords)
            ]
        }
        return {
            "status": "success",
            "mindmap": mindmap
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))