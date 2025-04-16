from ai_service.tts_service import TTSService

def main():
    # Initialize the TTS service
    tts = TTSService()
    
    # Test 1: Simple text-to-speech with audio playback
    print("Test 1: Converting text to speech...")
    text = "Hello! This is a test of the text to speech service with audio playback."
    audio_file = tts.text_to_speech(text)
    if audio_file:
        print(f"Audio file saved to: {audio_file}")
    
    # Test 2: Text-to-speech in a different language
    print("\nTest 2: Converting text to speech in Spanish...")
    spanish_text = "¡Hola! Esto es una prueba del servicio de texto a voz."
    spanish_audio = tts.text_to_speech(spanish_text, lang='es')
    if spanish_audio:
        print(f"Spanish audio file saved to: {spanish_audio}")

if __name__ == "__main__":
    main() 