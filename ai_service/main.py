from fastapi import FastAPI
from routers import summarizer, mindmap, ocr, tts, youtube

app = FastAPI()

app.include_router(summarizer.router)
app.include_router(mindmap.router)
app.include_router(ocr.router)
app.include_router(tts.router)
app.include_router(youtube.router)
