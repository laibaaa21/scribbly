from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from transformers import pipeline, AutoTokenizer
import numpy as np
from nltk.tokenize import sent_tokenize
from nltk.corpus import stopwords
from nltk.cluster.util import cosine_distance
import networkx as nx
import nltk
from heapq import nlargest
import logging
import traceback
from auth.auth_handler import get_current_user

# Configure logging
logger = logging.getLogger(__name__)

# Download required NLTK data
try:
    nltk.download('punkt')
    nltk.download('stopwords')
    logger.info("Successfully downloaded NLTK data")
except Exception as e:
    logger.error(f"Error downloading NLTK data: {e}")
    logger.error(traceback.format_exc())

# Define available models per tier
model_map = {
    "corporate": {
        "llama": "meta-llama/Meta-Llama-3-8B-Instruct",
        "gpt-neox": "EleutherAI/gpt-neox-20b",
        "bart": "facebook/bart-large-cnn"
    },
    "personal": {
        "distilbart": "sshleifer/distilbart-cnn-12-6",
        "tinyllama": "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
        "bart": "facebook/bart-large-cnn"
    }
}

# Cache for loaded models
model_cache = {}

class ModelInfo(BaseModel):
    id: str
    name: str
    description: str
    provider: str

class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=10, description="Text to summarize")
    compression_ratio: Optional[float] = Field(
        default=0.5,
        gt=0.0,
        lt=1.0,
        description="Target length of summary as a fraction of original text"
    )
    model_name: str = Field(
        ...,
        description="Model identifier to use for summarization"
    )

class SummarizeResponse(BaseModel):
    summary: str
    original_length: int
    summary_length: int
    compression_achieved: float
    model_used: str

def get_model_for_tier(tier: str, model_name: str):
    """Get the appropriate model based on user tier and model name."""
    if tier not in model_map:
        logger.error(f"Invalid tier: {tier}")
        raise HTTPException(status_code=400, detail="Invalid subscription tier")
    
    available_models = model_map[tier]
    if model_name not in available_models:
        logger.error(f"Model {model_name} not available for tier {tier}")
        raise HTTPException(
            status_code=400, 
            detail=f"Model {model_name} is not available for your subscription tier"
        )
    
    model_path = available_models[model_name]
    cache_key = f"{tier}_{model_name}"
    
    if cache_key not in model_cache:
        logger.info(f"Loading model {model_path} for tier {tier}")
        try:
            tokenizer = AutoTokenizer.from_pretrained(model_path)
            model = pipeline(
                "summarization",
                model=model_path,
                tokenizer=tokenizer,
                device="cpu"  # Change to "cuda" if you have GPU
            )
            model_cache[cache_key] = {
                "model": model,
                "tokenizer": tokenizer
            }
        except Exception as e:
            logger.error(f"Error loading model {model_path}: {str(e)}")
            logger.error(traceback.format_exc())
            raise HTTPException(
                status_code=500,
                detail=f"Failed to load model {model_name}"
            )
    
    return model_cache[cache_key]

def preprocess_text(text: str) -> str:
    """Clean and preprocess the input text."""
    try:
        # Remove extra whitespace
        text = ' '.join(text.split())
        logger.debug(f"Preprocessed text length: {len(text)}")
        return text
    except Exception as e:
        logger.error(f"Error in preprocess_text: {e}")
        raise

def get_sentence_scores(sentences, stop_words):
    """Calculate importance scores for each sentence."""
    word_freq = {}
    
    # Calculate word frequencies
    for sentence in sentences:
        for word in nltk.word_tokenize(sentence.lower()):
            if word not in stop_words and word.isalnum():
                word_freq[word] = word_freq.get(word, 0) + 1
    
    # Normalize word frequencies
    max_freq = max(word_freq.values()) if word_freq else 1
    word_freq = {word: freq/max_freq for word, freq in word_freq.items()}
    
    # Calculate sentence scores
    sentence_scores = {}
    for sentence in sentences:
        for word in nltk.word_tokenize(sentence.lower()):
            if word in word_freq:
                if sentence not in sentence_scores:
                    sentence_scores[sentence] = word_freq[word]
                else:
                    sentence_scores[sentence] += word_freq[word]
    
    return sentence_scores

def extractive_summarize(text: str, compression_ratio: float = 0.5) -> str:
    """
    Improved extractive summarization using frequency-based ranking
    """
    # Preprocess text
    text = preprocess_text(text)
    sentences = sent_tokenize(text)
    
    if len(sentences) <= 3:
        return text
    
    # Calculate number of sentences for summary
    num_sentences = max(3, int(len(sentences) * compression_ratio))
    
    # Get stop words
    stop_words = set(stopwords.words('english'))
    
    # Get sentence scores
    sentence_scores = get_sentence_scores(sentences, stop_words)
    
    # Select top sentences while maintaining order
    selected_sentences = nlargest(num_sentences, sentence_scores.items(), key=lambda x: x[1])
    selected_sentences = sorted(selected_sentences, key=lambda x: sentences.index(x[0]))
    
    return ' '.join(sent[0] for sent in selected_sentences)

def chunk_text(text: str, tokenizer, max_chunk_size: int = 1024) -> list:
    """Split text into chunks that fit within model's maximum token limit."""
    sentences = sent_tokenize(text)
    chunks = []
    current_chunk = []
    current_length = 0
    
    for sentence in sentences:
        sentence_tokens = len(tokenizer.encode(sentence))
        
        if current_length + sentence_tokens > max_chunk_size:
            if current_chunk:
                chunks.append(' '.join(current_chunk))
            current_chunk = [sentence]
            current_length = sentence_tokens
        else:
            current_chunk.append(sentence)
            current_length += sentence_tokens
    
    if current_chunk:
        chunks.append(' '.join(current_chunk))
    
    return chunks

def abstractive_summarize(text: str, compression_ratio: float = 0.5) -> str:
    """
    Improved abstractive summarization with better parameter tuning and chunking
    """
    # Preprocess text
    text = preprocess_text(text)
    
    # Split text into chunks if it's too long
    max_input_length = 1024  # BART's maximum input length
    chunks = chunk_text(text, max_input_length)
    summaries = []
    for chunk in chunks:
        chunk_length = len(chunk.split())
        target_length = max(30, int(chunk_length * compression_ratio))
        
        # Generate summary with carefully tuned parameters
        chunk_summary = summarizer(
            chunk,
            max_length=target_length,
            min_length=min(20, target_length - 10),
            length_penalty=1.5,  # Moderate penalty for length
            num_beams=5,  # Increased beam search
                early_stopping=True,
            no_repeat_ngram_size=3,
            do_sample=False,  # Deterministic output
            temperature=1.0,  # Default temperature
            top_p=0.95,  # Nucleus sampling threshold
            repetition_penalty=2.5  # Increased penalty for repetition
        )[0]['summary_text']
        
        summaries.append(chunk_summary)
        
        # Combine summaries if there were multiple chunks
    final_summary = ' '.join(summaries)
        
    # Clean up the final summary
    final_summary = final_summary.strip()
    if not final_summary.endswith('.'):
        final_summary += '.'
    
    return final_summary

router = APIRouter(
    prefix="/summarizer",
    tags=["summarizer"]
)

@router.get("/models", response_model=List[ModelInfo])
async def get_available_models(current_user: Dict = Depends(get_current_user)):
    """Get list of available models for the user's tier."""
    try:
        tier = current_user.get("subscription_tier", "personal")
        logger.info(f"Getting available models for tier: {tier}")
        
        if tier not in model_map:
            raise HTTPException(status_code=400, detail="Invalid subscription tier")
        
        available_models = []
        for model_id, model_path in model_map[tier].items():
            model_info = ModelInfo(
                id=model_id,
                name=model_path.split("/")[-1],
                description=f"HuggingFace model: {model_path}",
                provider="HuggingFace"
            )
            available_models.append(model_info)
        
        logger.info(f"Found {len(available_models)} models for tier {tier}")
        return available_models
        
    except Exception as e:
        logger.error(f"Error getting available models: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get available models: {str(e)}"
        )

@router.post("/", response_model=SummarizeResponse)
async def summarize_text(
    request: Request,
    summarize_req: SummarizeRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Summarize text using the specified model."""
    try:
        logger.info(f"Received summarization request - Model: {summarize_req.model_name}")
        logger.debug(f"Text length: {len(summarize_req.text)}, Compression ratio: {summarize_req.compression_ratio}")

        if not summarize_req.text.strip():
            raise HTTPException(status_code=400, detail="Text is empty")

        # Get user's tier and validate model access
        tier = current_user.get("subscription_tier", "personal")
        logger.info(f"User tier: {tier}")
        
        # Get the model and tokenizer
        model_instance = get_model_for_tier(tier, summarize_req.model_name)
        model = model_instance["model"]
        tokenizer = model_instance["tokenizer"]

        # Process text
        original_length = len(summarize_req.text.split())
        chunks = chunk_text(summarize_req.text, tokenizer)
        summaries = []

        for chunk in chunks:
            chunk_length = len(chunk.split())
            target_length = max(30, int(chunk_length * summarize_req.compression_ratio))
            
            # Generate summary
            chunk_summary = model(
                chunk,
                max_length=target_length,
                min_length=min(20, target_length - 10),
                length_penalty=1.5,
                num_beams=4,
                early_stopping=True,
                no_repeat_ngram_size=3,
                do_sample=False
            )[0]['summary_text']
            
            summaries.append(chunk_summary)

        # Combine summaries
        final_summary = ' '.join(summaries)
        final_summary = final_summary.strip()
        
        if not final_summary.endswith('.'):
            final_summary += '.'

        summary_length = len(final_summary.split())
        compression_achieved = summary_length / original_length if original_length > 0 else 0

        logger.info(f"Successfully generated summary - Original length: {original_length}, Summary length: {summary_length}")
        
        return SummarizeResponse(
            summary=final_summary,
            original_length=original_length,
            summary_length=summary_length,
            compression_achieved=compression_achieved,
            model_used=model_map[tier][summarize_req.model_name]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Summarization error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate summary: {str(e)}"
        ) 