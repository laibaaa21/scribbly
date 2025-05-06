from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

router = APIRouter()

# Updated implementation using the correct model namespace
try:
    # Load tokenizer and model using Auto classes which handle namespace resolution
    tokenizer = AutoTokenizer.from_pretrained("facebook/bart-large-cnn")
    model = AutoModelForSeq2SeqLM.from_pretrained("facebook/bart-large-cnn")
    model_loaded = True
except Exception as e:
    print(f"Error loading BART model: {str(e)}")
    model_loaded = False

class SummarizeRequest(BaseModel):
    text: str
    max_length: Optional[int] = 130
    min_length: Optional[int] = 30

@router.post("/summarize")
async def summarize_text(request: SummarizeRequest):
    try:
        if not model_loaded:
            raise Exception("Model failed to load. Please check transformers installation.")
            
        # Split text into chunks if it's too long (BART has a limit)
        max_chunk_length = 1024
        chunks = [request.text[i:i + max_chunk_length] for i in range(0, len(request.text), max_chunk_length)]
        
        summaries = []
        for chunk in chunks:
            # Encode the text
            inputs = tokenizer(chunk, max_length=1024, return_tensors="pt", truncation=True)
            
            # Generate summary 
            summary_ids = model.generate(
                inputs["input_ids"],
                max_length=request.max_length,
                min_length=request.min_length,
                num_beams=4,
                length_penalty=2.0,
                early_stopping=True,
                no_repeat_ngram_size=3
            )
            
            # Decode and add to summaries
            summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
            summaries.append(summary)
        
        # Combine summaries if there were multiple chunks
        final_summary = ' '.join(summaries)
        
        return {
            "status": "success",
            "summary": final_summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 