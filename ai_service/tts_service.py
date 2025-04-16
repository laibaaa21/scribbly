import base64
import os
from gtts import gTTS
from datetime import datetime
import pygame

class TTSService:
    def __init__(self):
        self.output_dir = "audio_output"
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
        pygame.mixer.init()

    def text_to_speech(self, text, lang='en', play_audio=True):
        try:
            tts = gTTS(text=text, lang=lang)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"speech_{timestamp}.mp3"
            filepath = os.path.join(self.output_dir, filename)
            tts.save(filepath)
            
            if play_audio:
                self._play_audio(filepath)
            
            return filepath
        except Exception as e:
            print(f"Error in text_to_speech: {str(e)}")
            return None

    def save_base64_audio(self, base64_string, filename="audio.mp3", play_audio=True):
        try:
            # Remove the data URL prefix if present
            if base64_string.startswith("data:audio"):
                base64_string = base64_string.split(",")[1]
            
            # Decode base64 string
            audio_data = base64.b64decode(base64_string)
            
            # Save to file
            filepath = os.path.join(self.output_dir, filename)
            with open(filepath, "wb") as f:
                f.write(audio_data)
            
            if play_audio:
                self._play_audio(filepath)
            
            return filepath
        except Exception as e:
            print(f"Error in save_base64_audio: {str(e)}")
            return None

    def _play_audio(self, filepath):
        try:
            pygame.mixer.music.load(filepath)
            pygame.mixer.music.play()
            # Wait for the audio to finish playing
            while pygame.mixer.music.get_busy():
                pygame.time.Clock().tick(10)
        except Exception as e:
            print(f"Error playing audio: {str(e)}")

# Example usage:
if __name__ == "__main__":
    tts = TTSService()
    
    # Test text-to-speech with audio playback
    text = "Hello, this is a test of the text to speech service."
    audio_file = tts.text_to_speech(text)
    if audio_file:
        print(f"Audio file saved to: {audio_file}")
    
    # Test base64 audio saving with playback
    # base64_string = "your_base64_string_here"
    # saved_file = tts.save_base64_audio(base64_string)
    # if saved_file:
    #     print(f"Base64 audio saved to: {saved_file}") 