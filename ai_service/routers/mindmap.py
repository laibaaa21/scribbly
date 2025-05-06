from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
from keybert import KeyBERT
from nltk.tokenize import sent_tokenize
import nltk
import spacy
import re

# Download NLTK data for sentence tokenization
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

# Initialize NLP tools
router = APIRouter()
kw_model = KeyBERT()
try:
    nlp = spacy.load("en_core_web_sm")
except:
    # For first-time use, download the model
    import os
    os.system("python -m spacy download en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

class MindmapRequest(BaseModel):
    text: str
    max_depth: Optional[int] = 3
    min_keywords: Optional[int] = 5
    max_keywords: Optional[int] = 8

@router.post("/Mindmap-gen")
async def generate_mindmap(request: MindmapRequest):
    try:
        # Clean and prepare the text
        clean_text = re.sub(r'\s+', ' ', request.text).strip()
        
        if len(clean_text) < 50:
            raise ValueError("Text is too short. Please provide a longer paragraph.")
        
        # Generate the mindmap using recursive approach
        mindmap = {
            "id": "root",
            "text": "Main Content",
            "color": "#4287f5",  # Default blue color
            "children": []
        }
        
        # Extract top-level keywords
        main_keywords = extract_keywords_from_text(clean_text, n=request.max_keywords)
        
        # Create the first level of nodes
        for i, (keyword, score) in enumerate(main_keywords):
            node_id = f"level1-{i}"
            keyword_node = {
                "id": node_id,
                "text": keyword,
                "color": get_color_for_depth(1, i),
                "children": []
            }
            
            # Find sentences related to this keyword
            related_sentences = find_related_sentences(clean_text, keyword)
            related_text = " ".join(related_sentences)
            
            # If we have related sentences and we haven't reached max depth,
            # recursively extract more keywords
            if related_text and request.max_depth > 1:
                populate_node_recursively(
                    keyword_node, 
                    related_text, 
                    current_depth=2, 
                    max_depth=request.max_depth,
                    max_keywords=request.min_keywords
                )
            
            mindmap["children"].append(keyword_node)
        
        return {
            "status": "success",
            "mindmap": mindmap
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def extract_keywords_from_text(text, n=5):
    """Extract keywords from text using KeyBERT."""
    keywords = kw_model.extract_keywords(
        text, 
        keyphrase_ngram_range=(1, 2), 
        stop_words='english', 
        use_mmr=True,  # Use maximal marginal relevance for diversity
        diversity=0.7,
        top_n=n
    )
    return keywords

def find_related_sentences(text, keyword):
    """Find sentences that contain the keyword or are semantically related."""
    sentences = sent_tokenize(text)
    keyword_lower = keyword.lower()
    
    # First pass: direct matches
    related = [s for s in sentences if keyword_lower in s.lower()]
    
    # If we don't have enough sentences, use NLP to find semantically related ones
    if len(related) < 3:
        # Process text with spaCy for better semantic matching
        doc = nlp(text)
        keyword_doc = nlp(keyword)
        
        # Find sentences with entities or noun phrases related to the keyword
        for sent in doc.sents:
            sent_text = sent.text
            if sent_text not in related:
                # Check if sentence contains entities or nouns similar to keyword
                for token in sent:
                    if (token.pos_ in ["NOUN", "PROPN"] and 
                        token.similarity(keyword_doc) > 0.6):
                        related.append(sent_text)
                        break
    
    return related[:5]  # Limit to 5 related sentences

def populate_node_recursively(node, text, current_depth, max_depth, max_keywords):
    """Recursively populate a node with sub-keywords extracted from related text."""
    if current_depth > max_depth or not text.strip():
        return
    
    # Extract sub-keywords
    sub_keywords = extract_keywords_from_text(text, n=max(3, max_keywords - current_depth))
    
    # Create child nodes
    for i, (sub_kw, score) in enumerate(sub_keywords):
        child_id = f"{node['id']}-{i}"
        child_node = {
            "id": child_id,
            "text": sub_kw,
            "color": get_color_for_depth(current_depth, i),
            "children": []
        }
        
        # Find text related to this sub-keyword
        related_sentences = find_related_sentences(text, sub_kw)
        related_text = " ".join(related_sentences)
        
        # If we haven't reached max depth and have related content, go deeper
        if related_text and current_depth < max_depth:
            populate_node_recursively(
                child_node, 
                related_text, 
                current_depth + 1, 
                max_depth,
                max_keywords
            )
        
        node["children"].append(child_node)

def get_color_for_depth(depth, index):
    """Generate colors based on depth and index for visual distinction."""
    # Color palettes for different levels
    color_palettes = {
        1: ["#f542a7", "#42f56f", "#4287f5", "#f5d742", "#f54242"],  # Level 1
        2: ["#f5a742", "#42f5e3", "#af42f5", "#f54275", "#42f59e"],  # Level 2
        3: ["#f542e9", "#42f542", "#427ef5", "#f5426a", "#97f542"]   # Level 3+
    }
    
    # Get the appropriate palette based on depth, defaulting to level 3 for deeper levels
    palette = color_palettes.get(min(depth, 3), color_palettes[3])
    
    # Return color from palette, wrapping around if index exceeds palette length
    return palette[index % len(palette)]