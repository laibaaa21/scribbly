from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from tts_service import TTSService

router = APIRouter()
tts_service = TTSService()

class TTSRequest(BaseModel):
    text: str
    lang: Optional[str] = 'en'
    play_audio: Optional[bool] = True

@router.post("/Text-to-speech")
async def text_to_speech(request: TTSRequest):
    try:
        audio_file = tts_service.text_to_speech(
            text=request.text,
            lang=request.lang,
            play_audio=request.play_audio
        )
        if audio_file:
            return {
                "status": "success",
                "message": "Text converted to speech successfully",
                "audio_file": audio_file
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to convert text to speech")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/base64-to-audio")
async def base64_to_audio(base64_string: str, filename: Optional[str] = "audio.mp3", play_audio: Optional[bool] = True):
    try:
        audio_file = tts_service.save_base64_audio(
            base64_string=base64_string,
            filename=filename,
            play_audio=play_audio
        )
        if audio_file:
            return {
                "status": "success",
                "message": "Base64 audio saved and played successfully",
                "audio_file": audio_file
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to process base64 audio")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 