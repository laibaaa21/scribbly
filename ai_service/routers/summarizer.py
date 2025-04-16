from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from transformers import pipeline

router = APIRouter()
summarizer = pipeline("Summarization", model="facebook/bart-large-cnn")

class SummarizeRequest(BaseModel):
    text: str
    max_length: Optional[int] = 130
    min_length: Optional[int] = 30

@router.post("/summarize")
async def summarize_text(request: SummarizeRequest):
    try:
        # Split text into chunks if it's too long (BART has a limit)
        max_chunk_length = 1024
        chunks = [request.text[i:i + max_chunk_length] for i in range(0, len(request.text), max_chunk_length)]
        
        summaries = []
        for chunk in chunks:
            summary = summarizer(chunk, max_length=request.max_length, min_length=request.min_length, do_sample=False)
            summaries.append(summary[0]['summary_text'])
        
        # Combine summaries if there were multiple chunks
        final_summary = ' '.join(summaries)
        
        return {
            "status": "success",
            "summary": final_summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 