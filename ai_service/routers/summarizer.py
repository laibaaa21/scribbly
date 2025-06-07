from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from transformers import pipeline, AutoTokenizer
import numpy as np
from nltk.tokenize import sent_tokenize
from nltk.corpus import stopwords
from nltk.cluster.util import cosine_distance
import networkx as nx
import nltk
from heapq import nlargest

# Download required NLTK data
try:
    nltk.download('punkt')
    nltk.download('stopwords')
except Exception as e:
    print(f"Error downloading NLTK data: {e}")

# Initialize the summarization pipeline with BART model and tokenizer
def initialize_model():
    global summarizer, tokenizer
    try:
        model_name = "facebook/bart-large-cnn"
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        summarizer = pipeline(
            "summarization",
            model=model_name,
            tokenizer=tokenizer,
            device="cpu",  # Change to "cuda" if you have GPU
            framework="pt"
        )
        print("Successfully initialized BART model and tokenizer")
        return True
    except Exception as e:
        print(f"Error initializing BART model: {e}")
        return False

# Try to initialize the model at startup
model_initialized = initialize_model()

router = APIRouter(
    tags=["summarizer"]
)

class SummarizeRequest(BaseModel):
    text: str
    compression_ratio: Optional[float] = 0.5
    method: Optional[str] = "abstractive"

class SummarizeResponse(BaseModel):
    summary: str

def preprocess_text(text: str) -> str:
    """Clean and preprocess the input text."""
    # Remove extra whitespace
    text = ' '.join(text.split())
    return text

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

def chunk_text(text: str, max_chunk_size: int) -> list:
    """Split text into chunks that fit within model's maximum token limit."""
    sentences = sent_tokenize(text)
    chunks = []
    current_chunk = []
    current_length = 0
    
    for sentence in sentences:
        sentence_tokens = len(tokenizer.encode(sentence))
        
        if current_length + sentence_tokens > max_chunk_size:
            if current_chunk:  # If we have accumulated sentences, add them as a chunk
                chunks.append(' '.join(current_chunk))
            current_chunk = [sentence]
            current_length = sentence_tokens
        else:
            current_chunk.append(sentence)
            current_length += sentence_tokens
    
    if current_chunk:  # Add the last chunk
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

@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_text(request: SummarizeRequest):
    try:
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Text is empty")

        if request.method == "extractive":
            summary = extractive_summarize(request.text, request.compression_ratio)
        else:
            if not model_initialized:
                # Try to initialize the model again if it failed at startup
                if not initialize_model():
                    raise HTTPException(
                        status_code=500,
                        detail="Failed to initialize summarization model. Please try again later."
                    )
            summary = abstractive_summarize(request.text, request.compression_ratio)

        if not summary:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate summary"
            )

        return SummarizeResponse(summary=summary)

    except Exception as e:
        print(f"Summarization error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate summary: {str(e)}"
        ) 