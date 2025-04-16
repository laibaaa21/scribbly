from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import pytesseract
from PIL import Image
import io
import os

# Configure Tesseract path for Windows
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

router = APIRouter()

class OCRResponse(BaseModel):
    text: str
    confidence: float

@router.post("/OCR")
async def extract_text(file: UploadFile = File(...), language: Optional[str] = 'eng'):
    try:
        # Read the uploaded file
        contents = await file.read()
        
        # Open the image using PIL
        image = Image.open(io.BytesIO(contents))
        
        # Extract text using pytesseract
        data = pytesseract.image_to_data(image, lang=language, output_type=pytesseract.Output.DICT)
        
        # Calculate average confidence
        confidences = [float(conf) for conf in data['conf'] if conf != '-1']
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        # Combine all text
        text = ' '.join([word for word in data['text'] if word.strip()])
        
        return OCRResponse(
            text=text,
            confidence=avg_confidence
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 