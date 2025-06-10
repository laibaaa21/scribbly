from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
from typing import Dict, List
import logging
from transformers import pipeline, AutoTokenizer
from auth.auth_handler import get_current_user

# Configure logging
logger = logging.getLogger(__name__)

# Define available models per tier with their HuggingFace paths
TIER_MODEL_MAP = {
    "corporate": {
        "models": [
            "meta-llama/Meta-Llama-3-8B-Instruct",  # Simulated placeholder
            "EleutherAI/gpt-neox-20b",
            "facebook/bart-large-cnn"
        ],
        "default": "facebook/bart-large-cnn"  # Use BART as default since others might be too large
    },
    "personal": {
        "models": [
            "sshleifer/distilbart-cnn-12-6",
            "facebook/bart-base",  # Lighter version for personal tier
            "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
        ],
        "default": "sshleifer/distilbart-cnn-12-6"
    }
}

# Cache for loaded models
model_cache = {}

class ModelInfo(BaseModel):
    id: str
    name: str
    description: str

class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=10, description="Text to summarize")
    compression_ratio: float = Field(
        default=0.3,
        gt=0.1,
        lt=0.9,
        description="Target length of summary as a fraction of original text"
    )
    model: str = Field(..., description="Model identifier to use for summarization")

class SummarizeResponse(BaseModel):
    summary: str
    model_used: str

router = APIRouter(
    prefix="/summarizer",
    tags=["summarizer"]
)

def get_tier_models(tier: str) -> list:
    """Get list of available models for a specific tier."""
    if tier not in TIER_MODEL_MAP:
        logger.error(f"Invalid tier: {tier}")
        return []
    
    models = TIER_MODEL_MAP[tier]["models"]
    return [(path, path.split("/")[-1]) for path in models]

@router.get("/models", response_model=List[ModelInfo])
async def get_available_models(current_user: Dict = Depends(get_current_user)):
    """Get list of available models for the user's tier."""
    try:
        # Get user's tier from the authenticated user info
        tier = current_user.get("subscription_tier", "personal")
        logger.info(f"Getting available models for tier: {tier}")
        
        # Get models for the user's tier
        tier_models = get_tier_models(tier)
        if not tier_models:
            raise HTTPException(status_code=400, detail="Invalid subscription tier")
        
        # Create model info objects
        available_models = []
        for model_path, model_name in tier_models:
            model_info = ModelInfo(
                id=model_name,
                name=model_name,
                description=f"HuggingFace model: {model_path}"
            )
            available_models.append(model_info)
        
        logger.info(f"Found {len(available_models)} models for tier {tier}")
        return available_models
        
    except Exception as e:
        logger.error(f"Error getting available models: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get available models: {str(e)}"
        )

def get_model_for_tier(tier: str, model_name: str):
    """Get the appropriate model based on user tier and model name."""
    if tier not in TIER_MODEL_MAP:
        logger.error(f"Invalid tier: {tier}")
        raise HTTPException(status_code=400, detail="Invalid subscription tier")
    
    # Get available models for the tier
    tier_models = get_tier_models(tier)
    if not tier_models:
        raise HTTPException(status_code=400, detail="No models available for your subscription tier")
    
    # Find the requested model
    model_paths = [path for path, name in tier_models if name == model_name]
    if not model_paths:
        logger.error(f"Model {model_name} not available for tier {tier}")
        raise HTTPException(
            status_code=400, 
            detail=f"Model {model_name} is not available for your subscription tier"
        )
    
    model_path = model_paths[0]
    cache_key = f"{tier}_{model_name}"
    
    # Load or get from cache
    if cache_key not in model_cache:
        logger.info(f"Loading model {model_path} for tier {tier}")
        try:
            tokenizer = AutoTokenizer.from_pretrained(model_path)
            model = pipeline(
                "summarization",
                model=model_path,
                tokenizer=tokenizer,
                device="cpu"
            )
            model_cache[cache_key] = {
                "model": model,
                "tokenizer": tokenizer
            }
        except Exception as e:
            logger.error(f"Error loading model {model_path}: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to load summarization model: {str(e)}"
            )
    
    return model_cache[cache_key]

@router.post("/", response_model=SummarizeResponse)
async def summarize_text(
    summarize_req: SummarizeRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Summarize text using the specified model based on user's tier."""
    try:
        # Get user's tier from the authenticated user info
        tier = current_user.get("subscription_tier", "personal")
        logger.info(f"Processing summarization request for tier: {tier}")
        
        # Get the model instance for this tier and model
        model_instance = get_model_for_tier(tier, summarize_req.model)
        model = model_instance["model"]
        tokenizer = model_instance["tokenizer"]
        
        # Process text
        max_chunk_size = 1024  # Maximum tokens per chunk
        text_tokens = tokenizer(summarize_req.text, truncation=False, return_tensors="pt")
        
        if len(text_tokens.input_ids[0]) > max_chunk_size:
            # Split into chunks if text is too long
            chunks = [summarize_req.text[i:i + max_chunk_size] for i in range(0, len(summarize_req.text), max_chunk_size)]
            summaries = []
            
            for chunk in chunks:
                chunk_summary = model(
                    chunk,
                    max_length=int(len(chunk.split()) * summarize_req.compression_ratio),
                    min_length=30,
                    do_sample=False
                )[0]["summary_text"]
                summaries.append(chunk_summary)
            
            final_summary = " ".join(summaries)
        else:
            # Process text in one go if it's short enough
            final_summary = model(
                summarize_req.text,
                max_length=int(len(summarize_req.text.split()) * summarize_req.compression_ratio),
                min_length=30,
                do_sample=False
            )[0]["summary_text"]
        
        # Clean up the summary
        final_summary = final_summary.strip()
        if not final_summary.endswith('.'):
            final_summary += '.'
            
        logger.info(f"Successfully generated summary using {summarize_req.model}")
        
        return SummarizeResponse(
            summary=final_summary,
            model_used=summarize_req.model
        )
        
    except Exception as e:
        logger.error(f"Error generating summary: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate summary: {str(e)}"
        )